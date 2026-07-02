// Configuration for DineFlow API Base URL
// Fall back to empty string for relative routing (proxy / production combined serve)
export const API_BASE = import.meta.env.VITE_API_URL || '';
