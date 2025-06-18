// Global VSCode API singleton to prevent multiple acquisitions
declare global {
	interface Window {
		__vscodeApi?: any;
	}
}

const getVSCodeAPI = () => {
	console.log('🔍 getVSCodeAPI called');
	console.log('🌍 window available:', typeof window !== 'undefined');
	console.log('🔗 acquireVsCodeApi available:', typeof window !== 'undefined' && typeof window.acquireVsCodeApi === 'function');
	console.log('📋 Current window properties:', typeof window !== 'undefined' ? Object.keys(window).filter(k => k.includes('vscode') || k.includes('acquire')) : []);
	
	// Check if a global instance already exists
	if (typeof window !== 'undefined' && window.__vscodeApi) {
		console.log('✅ Found existing VSCode API instance');
		return window.__vscodeApi;
	}
	
	// Check if acquireVsCodeApi is available
	if (typeof window !== 'undefined' && typeof window.acquireVsCodeApi === 'function') {
		try {
			console.log('🚀 Acquiring VSCode API...');
			const api = window.acquireVsCodeApi();
			window.__vscodeApi = api; // Store globally
			console.log('✅ VSCode API acquired successfully');
			return api;
		} catch (error) {
			// If API was already acquired, try to find it in parent window or existing instances
			console.warn('⚠️ VSCode API already acquired, using fallback:', error);
			return window.__vscodeApi || null;
		}
	}
	
	console.error('❌ VSCode API not available - running in standalone mode');
	return null;
};

export const vscode = getVSCodeAPI(); 