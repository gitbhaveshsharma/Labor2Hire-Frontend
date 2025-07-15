/**
 * Remote Configuration Client
 * Handles connection to remote configuration server and real-time updates
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
}

/**
 * Configuration Client Class
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
  private readonly PREFERENCE_STORAGE_KEY = '@Labor2Hire:UserPreferences:';

  constructor(options: ConfigClientOptions = {}) {
    // Default options
    this.options = {
      serverUrl: 'http://localhost:5002',
      onConfigUpdate: this.defaultConfigUpdateHandler,
      onFullConfigSync: this.defaultFullConfigSyncHandler,
      onConnectionChange: this.defaultConnectionChangeHandler,
      onError: this.defaultErrorHandler,
      reconnectDelay: 5000,
      reconnectAttempts: 10,
      autoReconnect: true,
      ...options,
    };
  }

  /**
   * Connect to the configuration server
   */
  connect(): void {
    try {
      if (!this.options.serverUrl) {
        throw new Error('Server URL is not defined');
      }
      
      // Create socket instance with connection options
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
    }
  }

  /**
   * Setup WebSocket event handlers
   */
  private setupEventHandlers(): void {
    if (!this.socket) return;

    // Handle successful connection
    this.socket.on('connect', () => {
      console.log('✅ Connected to remote configuration server');
      this.connected = true;
      this.reconnectAttempts = 0;
      this.lastActivity = Date.now();

      // Notify connection change
      if (this.options.onConnectionChange) {
        this.options.onConnectionChange(true, 'Connected successfully');
      }

      // Request full configuration on connect
      this.requestFullConfig();
    });

    // Handle disconnection
    this.socket.on('disconnect', (reason) => {
      console.log(`❌ Disconnected from remote configuration server: ${reason}`);
      this.connected = false;

      // Notify connection change
      if (this.options.onConnectionChange) {
        this.options.onConnectionChange(false, reason);
      }

      // Attempt reconnection if enabled
      if (this.options.autoReconnect) {
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
    this.socket.on('configUpdate', (data) => {
      const { screen, config } = data;
      console.log(`📥 Received configuration update for ${screen}`);
      
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
    this.socket.on('fullConfigSync', (data) => {
      const { configs } = data;
      console.log('📥 Received full configuration sync');

      // Update local configuration cache
      if (configs) {
        this.configs = { ...configs };
      }

      // Call sync handler
      if (this.options.onFullConfigSync) {
        this.options.onFullConfigSync(configs, data);
      }

      this.lastActivity = Date.now();
    });

    // Handle server pong response
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
      console.warn('⚠️ Cannot request configuration: Not connected');
      return;
    }

    console.log('🔄 Requesting full configuration from server');
    this.socket.emit('requestFullConfig');
  }

  /**
   * Request specific screen configuration
   * @param screenName - Name of the screen
   */
  requestScreenConfig(screenName: string): void {
    if (!this.socket || !this.connected) {
      console.warn(`⚠️ Cannot request ${screenName} configuration: Not connected`);
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
   * Get current configuration for a screen
   * @param screenName - Name of the screen
   * @returns Configuration object or null
   */
  getScreenConfig(screenName: string): any | null {
    return this.configs[screenName] || null;
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

  /**
   * Handle client error
   * @param type - Error type
   * @param error - Error object
   */
  private handleError(type: string, error: any): void {
    if (this.options.onError) {
      this.options.onError(type, error);
    }
  }
}

// Create and export singleton instance
export const configClient = new ConfigClient({
  // Use the backend URL, can be changed to production URL
  serverUrl: 'http://localhost:5002',
  autoReconnect: true,
});

export default configClient;
