/**
 * Enhanced Performance and Caching Utilities for Backend-Driven UI
 * Provides performance optimizations, caching strategies, and monitoring
 * @author Labor2Hire Team
 */

import React from 'react';
import { ComponentDefinition } from '../components/common/DynamicRenderer';

/**
 * Performance Metrics Interface
 */
interface PerformanceMetrics {
    renderTime: number;
    componentCount: number;
    memoryUsage: number;
    cacheHitRate: number;
    timestamp: string;
}

/**
 * Component Cache Manager
 * Manages caching of component trees for better performance
 */
class ComponentCacheManager {
    private cache: Map<string, {
        data: ComponentDefinition[];
        timestamp: number;
        accessCount: number;
        lastAccessed: number;
    }> = new Map();
    
    private maxCacheSize = 50;
    private maxAge = 5 * 60 * 1000; // 5 minutes
    private metrics: PerformanceMetrics[] = [];

    /**
     * Get cached component tree
     */
    get(key: string): ComponentDefinition[] | null {
        const cached = this.cache.get(key);
        
        if (!cached) {
            return null;
        }

        // Check if cache is expired
        if (Date.now() - cached.timestamp > this.maxAge) {
            this.cache.delete(key);
            return null;
        }

        // Update access statistics
        cached.accessCount++;
        cached.lastAccessed = Date.now();
        
        return cached.data;
    }

    /**
     * Set component tree in cache
     */
    set(key: string, data: ComponentDefinition[]): void {
        // Clean up cache if it's getting too large
        if (this.cache.size >= this.maxCacheSize) {
            this.evictLeastRecentlyUsed();
        }

        this.cache.set(key, {
            data: this.deepClone(data),
            timestamp: Date.now(),
            accessCount: 1,
            lastAccessed: Date.now(),
        });
    }

    /**
     * Clear cache
     */
    clear(): void {
        this.cache.clear();
    }

    /**
     * Get cache statistics
     */
    getStats(): {
        size: number;
        hitRate: number;
        totalAccess: number;
        memoryEstimate: number;
    } {
        let totalAccess = 0;
        let memoryEstimate = 0;

        this.cache.forEach(item => {
            totalAccess += item.accessCount;
            memoryEstimate += JSON.stringify(item.data).length * 2; // Rough estimate in bytes
        });

        return {
            size: this.cache.size,
            hitRate: this.calculateHitRate(),
            totalAccess,
            memoryEstimate,
        };
    }

    /**
     * Evict least recently used items
     */
    private evictLeastRecentlyUsed(): void {
        let lruKey = '';
        let lruTime = Date.now();

        this.cache.forEach((value, key) => {
            if (value.lastAccessed < lruTime) {
                lruTime = value.lastAccessed;
                lruKey = key;
            }
        });

        if (lruKey) {
            this.cache.delete(lruKey);
        }
    }

    /**
     * Calculate cache hit rate
     */
    public calculateHitRate(): number {
        const recent = this.metrics.slice(-10); // Last 10 metrics
        if (recent.length === 0) return 0;
        
        const avgHitRate = recent.reduce((sum, metric) => sum + metric.cacheHitRate, 0) / recent.length;
        return avgHitRate;
    }

    /**
     * Deep clone component definitions
     */
    private deepClone(obj: any): any {
        if (obj === null || typeof obj !== 'object') return obj;
        if (obj instanceof Date) return new Date(obj.getTime());
        if (obj instanceof Array) return obj.map(item => this.deepClone(item));
        
        const cloned: any = {};
        Object.keys(obj).forEach(key => {
            cloned[key] = this.deepClone(obj[key]);
        });
        
        return cloned;
    }
}

/**
 * Performance Monitor
 * Monitors rendering performance and provides optimization suggestions
 */
class PerformanceMonitor {
    private renderTimes: number[] = [];
    private componentCounts: number[] = [];
    
    /**
     * Start performance measurement
     */
    startMeasurement(): { endMeasurement: () => PerformanceMetrics } {
        const startTime = performance.now();
        const startMemory = this.getMemoryUsage();
        
        return {
            endMeasurement: (): PerformanceMetrics => {
                const endTime = performance.now();
                const renderTime = endTime - startTime;
                
                this.renderTimes.push(renderTime);
                if (this.renderTimes.length > 100) {
                    this.renderTimes.shift(); // Keep only last 100 measurements
                }
                
                return {
                    renderTime,
                    componentCount: 0, // Will be set by caller
                    memoryUsage: this.getMemoryUsage() - startMemory,
                    cacheHitRate: cacheManager.calculateHitRate(),
                    timestamp: new Date().toISOString(),
                };
            }
        };
    }

    /**
     * Get average render time
     */
    getAverageRenderTime(): number {
        if (this.renderTimes.length === 0) return 0;
        return this.renderTimes.reduce((sum, time) => sum + time, 0) / this.renderTimes.length;
    }

    /**
     * Get performance suggestions
     */
    getOptimizationSuggestions(): string[] {
        const suggestions: string[] = [];
        const avgRenderTime = this.getAverageRenderTime();
        
        if (avgRenderTime > 100) {
            suggestions.push('Consider reducing component tree depth - current average render time is high');
        }
        
        if (avgRenderTime > 200) {
            suggestions.push('Component tree is very complex - consider implementing virtualization');
        }
        
        const cacheStats = cacheManager.getStats();
        if (cacheStats.hitRate < 0.7) {
            suggestions.push('Cache hit rate is low - consider adjusting cache strategy');
        }
        
        if (cacheStats.memoryEstimate > 10 * 1024 * 1024) { // 10MB
            suggestions.push('Cache memory usage is high - consider reducing cache size');
        }
        
        return suggestions;
    }

    /**
     * Get memory usage (rough estimate)
     */
    private getMemoryUsage(): number {
        // This is a simplified estimate since React Native doesn't expose detailed memory info
        try {
            return (performance as any).memory?.usedJSHeapSize || 0;
        } catch {
            return 0;
        }
    }
}

/**
 * Component Tree Optimizer
 * Optimizes component trees for better performance
 */
class ComponentTreeOptimizer {
    /**
     * Optimize component tree
     */
    optimize(components: ComponentDefinition[]): ComponentDefinition[] {
        return components.map(component => this.optimizeComponent(component));
    }

    /**
     * Optimize individual component
     */
    private optimizeComponent(component: ComponentDefinition): ComponentDefinition {
        const optimized = { ...component };
        
        // Optimize children recursively
        if (optimized.children && optimized.children.length > 0) {
            optimized.children = optimized.children.map(child => this.optimizeComponent(child));
            
            // Flatten unnecessary nesting
            optimized.children = this.flattenUnnecessaryNesting(optimized.children);
        }
        
        // Remove empty or unnecessary properties
        this.removeEmptyProperties(optimized);
        
        return optimized;
    }

    /**
     * Flatten unnecessary View nesting
     */
    private flattenUnnecessaryNesting(children: ComponentDefinition[]): ComponentDefinition[] {
        const flattened: ComponentDefinition[] = [];
        
        children.forEach(child => {
            // If it's a View with only one child and no special properties, consider flattening
            if (child.type === 'View' && 
                child.children && 
                child.children.length === 1 && 
                !child.style && 
                !child.actions && 
                !child.conditions) {
                flattened.push(...this.flattenUnnecessaryNesting(child.children));
            } else {
                flattened.push(child);
            }
        });
        
        return flattened;
    }

    /**
     * Remove empty properties
     */
    private removeEmptyProperties(component: ComponentDefinition): void {
        Object.keys(component).forEach(key => {
            const value = (component as any)[key];
            if (value === null || value === undefined || 
                (typeof value === 'object' && Object.keys(value).length === 0) ||
                (Array.isArray(value) && value.length === 0)) {
                delete (component as any)[key];
            }
        });
    }

    /**
     * Validate component tree structure
     */
    validateComponentTree(components: ComponentDefinition[]): {
        isValid: boolean;
        errors: string[];
        warnings: string[];
    } {
        const errors: string[] = [];
        const warnings: string[] = [];
        
        const validateComponent = (component: ComponentDefinition, path: string) => {
            // Check required properties
            if (!component.type) {
                errors.push(`Component at ${path} is missing 'type' property`);
            }
            
            // Check for unknown component types
            const validTypes = ['View', 'Text', 'TouchableOpacity', 'Image', 'ScrollView', 'SafeAreaView', 'ActivityIndicator', 'TextInput', 'FlatList', 'Modal', 'Switch', 'Button', 'Pressable'];
            if (component.type && !validTypes.includes(component.type)) {
                warnings.push(`Unknown component type '${component.type}' at ${path}`);
            }
            
            // Check for potential performance issues
            if (component.children && component.children.length > 20) {
                warnings.push(`Component at ${path} has many children (${component.children.length}), consider virtualization`);
            }
            
            // Validate children recursively
            if (component.children) {
                component.children.forEach((child, index) => {
                    validateComponent(child, `${path}.children[${index}]`);
                });
            }
        };
        
        components.forEach((component, index) => {
            validateComponent(component, `components[${index}]`);
        });
        
        return {
            isValid: errors.length === 0,
            errors,
            warnings,
        };
    }
}

// Create singleton instances
export const cacheManager = new ComponentCacheManager();
export const performanceMonitor = new PerformanceMonitor();
export const componentOptimizer = new ComponentTreeOptimizer();

/**
 * Higher-order component for performance monitoring
 */
export const withPerformanceMonitoring = <P extends object>(
    WrappedComponent: React.ComponentType<P>
): React.ComponentType<P> => {
    return (props: P) => {
        const measurement = performanceMonitor.startMeasurement();
        
        React.useEffect(() => {
            // End measurement after render
            const metrics = measurement.endMeasurement();
            console.log('Component render metrics:', metrics);
            
            // Log optimization suggestions periodically
            const suggestions = performanceMonitor.getOptimizationSuggestions();
            if (suggestions.length > 0) {
                console.log('Performance optimization suggestions:', suggestions);
            }
        });
        
        return React.createElement(WrappedComponent, props);
    };
};

/**
 * Hook for using component cache
 */
export const useComponentCache = (key: string, factory: () => ComponentDefinition[]) => {
    const cached = cacheManager.get(key);
    
    if (cached) {
        return cached;
    }
    
    const fresh = factory();
    cacheManager.set(key, fresh);
    return fresh;
};

export default {
    cacheManager,
    performanceMonitor,
    componentOptimizer,
    withPerformanceMonitoring,
    useComponentCache,
};
