/**
 * Enhanced Remote Configuration Client
 * Handles connection to remote configuration server and real-time updates
 * Includes offline support, enhanced error handling, and performance optimizations
 * @author Labor2Hire Team
 */

import { io, Socket } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ConfigClientOptions {
  serverUrl?: string;
  onConfigUpdate?: (screen: string, config: any, data: any) => void;
  onFullConfigSync?: (configs: any, data: any) => void;
  onConnectionChange?: (connected: boolean, reason: string) => void;
  onError?: (type: string, error: any) => void;
  reconnectDelay?: number;
  reconnectAttempts?: number;
  autoReconnect?: boolean;
  offlineSupport?: boolean;
  cacheExpiry?: number;
  enableMetrics?: boolean;
}

/**
 * Enhanced Configuration Client Class
 * Handles connection to remote configuration server and real-time updates
 */
export class ConfigClient {
  socket: Socket | null = null;
  options: ConfigClientOptions;
  private configs: Record<string, any> = {};
  private connected = false;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private lastActivity = Date.now();
  private pendingRequests: Set<string> = new Set();
  private readonly PREFERENCE_STORAGE_KEY = '@Labor2Hire:UserPreferences:';
  private readonly CONFIG_CACHE_KEY = '@Labor2Hire:ConfigCache:';
  private readonly CACHE_METADATA_KEY = '@Labor2Hire:CacheMetadata';
  private metrics = {
    connectionAttempts: 0,
    successfulConnections: 0,
    configRequests: 0,
    cacheHits: 0,
    cacheMisses: 0,
    errors: 0,
  };

  constructor(options: ConfigClientOptions = {}) {
    // Default options with enhanced features
    this.options = {
      serverUrl: 'http://10.0.2.2:5001',
      onConfigUpdate: this.defaultConfigUpdateHandler,
      onFullConfigSync: this.defaultFullConfigSyncHandler,
      onConnectionChange: this.defaultConnectionChangeHandler,
      onError: this.defaultErrorHandler,
      reconnectDelay: 5000,
      reconnectAttempts: 10,
      autoReconnect: true,
      offlineSupport: true,
      cacheExpiry: 24 * 60 * 60 * 1000, // 24 hours
      enableMetrics: true,
      ...options,
    };

    // Load cached configurations on initialization
    this.loadCachedConfigurations();
  }

  /**
   * Load cached configurations from local storage
   */
  private async loadCachedConfigurations(): Promise<void> {
    if (!this.options.offlineSupport) return;

    try {
      const cacheMetadata = await AsyncStorage.getItem(this.CACHE_METADATA_KEY);
      const metadata = cacheMetadata ? JSON.parse(cacheMetadata) : {};

      // Check if cache is still valid
      const now = Date.now();
      if (metadata.timestamp && (now - metadata.timestamp) > (this.options.cacheExpiry || 24 * 60 * 60 * 1000)) {
        console.log('🗑️ Cache expired, clearing cached configurations');
        await this.clearCache();
        return;
      }

      const cachedConfigs = await AsyncStorage.getItem(this.CONFIG_CACHE_KEY);
      if (cachedConfigs) {
        this.configs = JSON.parse(cachedConfigs);
        console.log(`📱 Loaded ${Object.keys(this.configs).length} cached configurations`);
        
        if (this.options.enableMetrics) {
          this.metrics.cacheHits += Object.keys(this.configs).length;
        }
      }
    } catch (error) {
      console.error('❌ Failed to load cached configurations:', error);
      this.handleError('cache_load', error);
    }
  }

  /**
   * Save configurations to local cache
   */
  private async saveCachedConfigurations(): Promise<void> {
    if (!this.options.offlineSupport) return;

    try {
      await AsyncStorage.setItem(this.CONFIG_CACHE_KEY, JSON.stringify(this.configs));
      await AsyncStorage.setItem(this.CACHE_METADATA_KEY, JSON.stringify({
        timestamp: Date.now(),
        version: '1.0.0',
        totalConfigs: Object.keys(this.configs).length,
      }));
      console.log('💾 Configurations cached successfully');
    } catch (error) {
      console.error('❌ Failed to cache configurations:', error);
      this.handleError('cache_save', error);
    }
  }

  /**
   * Clear cached configurations
   */
  private async clearCache(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.CONFIG_CACHE_KEY);
      await AsyncStorage.removeItem(this.CACHE_METADATA_KEY);
      console.log('🗑️ Cache cleared successfully');
    } catch (error) {
      console.error('❌ Failed to clear cache:', error);
    }
  }

  /**
   * Enhanced connect with metrics and error handling
   */
  connect(): void {
    // If socket exists and is trying to connect or is already connected, do nothing.
    if (this.socket && this.socket.active) {
      console.log('🔌 Connection already active or attempting. Ignoring connect call.');
      return;
    }

    // If socket exists but is disconnected, try to reconnect it manually.
    if (this.socket) {
      console.log('🔌 Attempting to reconnect using existing socket instance...');
      this.socket.connect();
      return;
    }
    try {
      if (this.options.enableMetrics) {
        this.metrics.connectionAttempts++;
      }

      if (!this.options.serverUrl) {
        throw new Error('Server URL is not defined');
      }
      
      // Create socket instance with enhanced connection options
      this.socket = io(this.options.serverUrl, {
        path: '/config-socket',
        reconnection: false, // We'll handle reconnection manually
        transports: ['websocket', 'polling'],
        timeout: 10000,
      });

      // Setup event handlers
      this.setupEventHandlers();

      console.log('🔌 Connecting to remote configuration server...');
    } catch (error) {
      console.error('❌ Failed to initialize socket connection:', error);
      this.handleError('connection', error);
      
      // Use cached configurations if available
      if (this.options.offlineSupport && Object.keys(this.configs).length > 0) {
        console.log('📱 Using cached configurations in offline mode');
        this.notifyFullConfigSync();
      }
    }
  }

  /**
   * Notify full config sync from cache
   */
  private notifyFullConfigSync(): void {
    if (this.options.onFullConfigSync && Object.keys(this.configs).length > 0) {
      this.options.onFullConfigSync(this.configs, {
        source: 'cache',
        timestamp: new Date().toISOString(),
        totalConfigs: Object.keys(this.configs).length,
      });
    }
  }

  /**
   * Enhanced setup event handlers with better error handling
   */
  private setupEventHandlers(): void {
    if (!this.socket) return;

      // Handle successful connection
      this.socket.on('connect', () => {
        console.log('✅ Connected to remote configuration server');
        this.connected = true;
        this.reconnectAttempts = 0;
        this.lastActivity = Date.now();

        if (this.options.enableMetrics) {
          this.metrics.successfulConnections++;
        }

        // Notify connection change
        if (this.options.onConnectionChange) {
          this.options.onConnectionChange(true, 'Connected successfully');
        }

        // Request full configuration on connect
        this.requestFullConfig();

        // Process any pending requests
        if (this.pendingRequests.size > 0) {
          console.log(`🔄 Processing ${this.pendingRequests.size} pending configuration requests`);
          for (const screenName of this.pendingRequests) {
            this.requestScreenConfig(screenName);
          }
          this.pendingRequests.clear();
        }
      });    // Handle disconnection
    this.socket.on('disconnect', (reason) => {
      console.log(`❌ Disconnected from remote configuration server: ${reason}`);
      this.connected = false;

      // Notify connection change
      if (this.options.onConnectionChange) {
        this.options.onConnectionChange(false, reason);
      }

      // Only attempt reconnection for unexpected disconnections
      // Don't reconnect for intentional server disconnections
      if (this.options.autoReconnect && reason !== 'io server disconnect') {
        this.attemptReconnection();
      }
    });

    // Handle connection error
    this.socket.on('connect_error', (error) => {
      console.error('❌ Connection error:', error);
      this.handleError('connect_error', error);

      // Attempt reconnection if enabled
      if (this.options.autoReconnect) {
        this.attemptReconnection();
      }
    });

      // Handle configuration updates for specific screen
      this.socket.on('screenConfigUpdate', async (data) => {
        const { screen, config } = data;
        console.log(`📥 Received configuration update for ${screen}`);
        
        // Validate configuration before updating
        if (screen && config && this.validateScreenConfig(screen, config)) {
          // Update local configuration cache
          this.configs[screen] = config;
          
          // Save to persistent cache if offline support enabled
          if (this.options.offlineSupport) {
            await this.saveCachedConfigurations();
          }

          // Call update handler
          if (this.options.onConfigUpdate) {
            this.options.onConfigUpdate(screen, config, data);
          }
        } else {
          console.warn('⚠️ Received invalid configuration update, ignoring');
          this.handleError('invalid_config', new Error(`Invalid config for ${screen}`));
        }

        this.lastActivity = Date.now();
      });    // Also handle the legacy 'configUpdate' event for backward compatibility
    this.socket.on('configUpdate', (data) => {
      const { screen, config } = data;
      console.log(`📥 Received legacy configuration update for ${screen}`);
      
      // Update local configuration cache
      if (screen && config) {
        this.configs[screen] = config;
      }

      // Call update handler
      if (this.options.onConfigUpdate) {
        this.options.onConfigUpdate(screen, config, data);
      }

      this.lastActivity = Date.now();
    });

      // Handle full configuration sync
      this.socket.on('fullConfigSync', async (data) => {
        const { configs } = data;
        console.log('📥 Received full configuration sync');

        // Validate configurations before updating
        if (configs && typeof configs === 'object') {
          try {
            // Validate each screen configuration
            const validatedConfigs: Record<string, any> = {};
            let validCount = 0;
            let invalidCount = 0;

            Object.keys(configs).forEach(screenName => {
              const config = configs[screenName];
              if (this.validateScreenConfig(screenName, config)) {
                validatedConfigs[screenName] = config;
                validCount++;
              } else {
                console.warn(`⚠️ Invalid configuration structure for screen: ${screenName}`);
                invalidCount++;
              }
            });

            // Update local configuration cache with validated configs
            this.configs = { ...validatedConfigs };

            // Save to persistent cache if offline support enabled
            if (this.options.offlineSupport) {
              await this.saveCachedConfigurations();
            }

            console.log(`✅ Successfully synchronized ${validCount} screen configurations${invalidCount > 0 ? ` (${invalidCount} invalid)` : ''}`);

            // Call sync handler
            if (this.options.onFullConfigSync) {
              this.options.onFullConfigSync(this.configs, {
                ...data,
                validCount,
                invalidCount,
                source: 'server',
              });
            }
          } catch (error) {
            console.error('❌ Failed to process full configuration sync:', error);
            this.handleError('fullConfigSync', error);
          }
        } else {
          console.warn('⚠️ Invalid full configuration sync data received');
          this.handleError('fullConfigSync', new Error('Invalid sync data format'));
        }

        this.lastActivity = Date.now();
      });    // Handle server pong response
    this.socket.on('pong', (data) => {
      console.log('❤️ Server heartbeat received:', data);
      this.lastActivity = Date.now();
    });
  }

  /**
   * Request full configuration from server
   */
  requestFullConfig(): void {
    if (!this.socket || !this.connected) {
      // Only show warning if we don't have any cached configurations to serve
      if (!this.options.offlineSupport || Object.keys(this.configs).length === 0) {
        console.warn('⚠️ Cannot request configuration: Not connected');
      }
      return;
    }

    console.log('🔄 Requesting full configuration from server');
    this.socket.emit('requestFullConfig');
  }

  /**
   * Enhanced request screen configuration with caching
   * @param screenName - Name of the screen
   */
  requestScreenConfig(screenName: string): void {
    if (this.options.enableMetrics) {
      this.metrics.configRequests++;
    }

    if (!this.socket || !this.connected) {
      // Try to serve from cache if offline support enabled
      if (this.options.offlineSupport && this.configs[screenName]) {
        console.log(`📱 Serving ${screenName} from cache (offline mode)`);
        if (this.options.onConfigUpdate) {
          this.options.onConfigUpdate(screenName, this.configs[screenName], {
            source: 'cache',
            timestamp: new Date().toISOString(),
          });
        }
        
        if (this.options.enableMetrics) {
          this.metrics.cacheHits++;
        }
        return;
      }

      // Only show message if no cache is available and not already pending
      if (!this.configs[screenName] && !this.pendingRequests.has(screenName)) {
        console.log(`🔄 ${screenName} configuration requested while connecting - will retry once connected`);
        
        // Store the request to retry once connected
        this.pendingRequests.add(screenName);
      }

      if (this.options.enableMetrics) {
        this.metrics.cacheMisses++;
      }
      return;
    }

    console.log(`🔄 Requesting ${screenName} configuration from server`);
    this.socket.emit('requestScreenConfig', screenName);
  }

  /**
   * Send ping to server for health check
   */
  ping(): void {
    if (!this.socket || !this.connected) return;

    this.socket.emit('ping', { timestamp: Date.now() });
  }

  /**
   * Handle error with enhanced logging and metrics
   */
  private handleError(type: string, error: any): void {
    if (this.options.enableMetrics) {
      this.metrics.errors++;
    }

    console.error(`❌ ConfigClient error [${type}]:`, error);
    
    if (this.options.onError) {
      this.options.onError(type, error);
    }
  }

  /**
   * Get client metrics
   */
  getMetrics(): typeof this.metrics {
    return { ...this.metrics };
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.metrics = {
      connectionAttempts: 0,
      successfulConnections: 0,
      configRequests: 0,
      cacheHits: 0,
      cacheMisses: 0,
      errors: 0,
    };
  }

  /**
   * Get connection statistics
   */
  getConnectionStats(): object {
    return {
      connected: this.connected,
      lastActivity: this.lastActivity,
      reconnectAttempts: this.reconnectAttempts,
      totalConfigs: Object.keys(this.configs).length,
      metrics: this.getMetrics(),
    };
  }

  /**
   * Validate screen configuration structure
   */
  private validateScreenConfig(screenName: string, config: any): boolean {
    if (!config) {
      console.warn(`⚠️ Empty configuration for screen: ${screenName}`);
      return false;
    }

    if (!config.screenType) {
      console.warn(`⚠️ Missing screenType for screen: ${screenName}`);
      return false;
    }

    if (!config.metadata) {
      console.warn(`⚠️ Missing metadata for screen: ${screenName}`);
      return false;
    }

    if (!config.components || !Array.isArray(config.components)) {
      console.warn(`⚠️ Missing or invalid components array for screen: ${screenName}`);
      return false;
    }

    return true;
  }

  /**
   * Get screen configuration with validation
   */
  getScreenConfig(screenName: string): any | null {
    const config = this.configs[screenName] || null;
    
    if (config && !this.validateScreenConfig(screenName, config)) {
      console.warn(`⚠️ Invalid configuration structure for screen: ${screenName}`);
    }
    
    return config;
  }

  /**
   * Get all current configurations
   * @returns All configurations
   */
  getAllConfigs(): Record<string, any> {
    return { ...this.configs };
  }

  /**
   * Check if client is connected
   * @returns Connection status
   */
  isClientConnected(): boolean {
    return this.connected;
  }

  /**
   * Store user preference
   * @param key - Preference key
   * @param value - Preference value
   */
  async storePreference(key: string, value: string): Promise<void> {
    try {
      const fullKey = `${this.PREFERENCE_STORAGE_KEY}${key}`;
      await AsyncStorage.setItem(fullKey, value);
      console.log(`✅ Stored user preference: ${key}`);
    } catch (error) {
      console.error(`❌ Failed to store user preference ${key}:`, error);
      throw error;
    }
  }

  /**
   * Get user preference
   * @param key - Preference key
   * @returns Preference value or null
   */
  async getPreference(key: string): Promise<string | null> {
    try {
      const fullKey = `${this.PREFERENCE_STORAGE_KEY}${key}`;
      const value = await AsyncStorage.getItem(fullKey);
      return value;
    } catch (error) {
      console.error(`❌ Failed to get user preference ${key}:`, error);
      return null;
    }
  }

  /**
   * Attempt reconnection to server
   */
  private attemptReconnection(): void {
    // Don't attempt reconnection if already connected
    if (this.connected && this.socket?.connected) {
      console.log('🔌 Already connected, skipping reconnection attempt');
      return;
    }

    // Clear any existing reconnection timer
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    // Check if max reconnection attempts reached
    if (
      this.options.reconnectAttempts !== undefined &&
      this.reconnectAttempts >= this.options.reconnectAttempts
    ) {
      console.error('❌ Maximum reconnection attempts reached, giving up');
      this.handleError('reconnect_failed', new Error('Maximum reconnection attempts reached'));
      return;
    }

    // Increment reconnection attempts
    this.reconnectAttempts++;

    // Calculate delay with backoff
    const delay = this.options.reconnectDelay || 5000;

    console.log(`⏳ Attempting reconnection in ${delay / 1000}s (attempt ${this.reconnectAttempts})`);

    // Set timer for reconnection
    this.reconnectTimer = setTimeout(() => {
      console.log('🔌 Reconnecting to server...');

      // Close existing socket if any
      if (this.socket) {
        this.socket.close();
      }

      // Create new connection
      this.connect();
    }, delay);
  }

  /**
   * Disconnect from server
   */
  disconnect(): void {
    if (!this.socket) return;

    console.log('🔌 Disconnecting from remote configuration server');
    this.socket.disconnect();
    this.socket = null;
    this.connected = false;
  }

  /**
   * Default configuration update handler
   * @param screen - Screen name
   * @param _config - Updated configuration (unused)
   * @param _data - Full update data (unused)
   */
  private defaultConfigUpdateHandler(screen: string, _config: any, _data: any): void {
    console.log(`📝 Default handler: Configuration updated for ${screen}`);
  }

  /**
   * Default full configuration sync handler
   * @param _configs - All configurations (unused)
   * @param _data - Full sync data (unused)
   */
  private defaultFullConfigSyncHandler(_configs: any, _data: any): void {
    console.log('📝 Default handler: Full configuration sync received');
  }

  /**
   * Default connection change handler
   * @param connected - Connection status
   * @param reason - Reason for change
   */
  private defaultConnectionChangeHandler(connected: boolean, reason: string): void {
    console.log(`📝 Default handler: Connection changed to ${connected ? 'connected' : 'disconnected'} (${reason})`);
  }

  /**
   * Default error handler
   * @param type - Error type
   * @param error - Error object
   */
  private defaultErrorHandler(type: string, error: any): void {
    console.error(`📝 Default handler: Error occurred (${type})`, error);
  }
}

// Create and export singleton instance
export const configClient = new ConfigClient({
  // Use the backend URL, can be changed to production URL
  serverUrl: 'http://10.0.2.2:5001',
  autoReconnect: true,
});

export default configClient;
