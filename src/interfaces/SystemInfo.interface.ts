/**
 * Basic system information
 */
export interface SystemInfo {
  hostname: string;
  platform: string;
  arch: string;
  totalMemory: string;
  freeMemory: string;
  uptime: string;
  cpuLoad: number[];
  nodeVersion: string;
}
