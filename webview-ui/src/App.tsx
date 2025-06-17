import { useState, useEffect } from "react"
import EgovView from "./components/egov/EgovView"
import { EgovViewTab } from "./shared/egovframe"
import { VSCodeProvider, useVSCode } from "./context/VSCodeContext"

const AppContent = () => {
  console.log('📱 AppContent component rendering...');
  
  const [activeTab, setActiveTab] = useState<EgovViewTab>("projects")
  const { vscode, isReady } = useVSCode()

  useEffect(() => {
    console.log('🔧 AppContent useEffect running...');
    
    if (!isReady || !vscode) {
      console.log('⏳ VSCode API not ready yet...');
      return
    }

    console.log('✅ VSCode API is ready:', vscode);
    
    // 메시지 리스너 추가
    const handleMessage = (event: MessageEvent) => {
      console.log('📨 Received message in AppContent:', event.data);
      const message = event.data
      if (message.type === "switchEgovTab" && message.text) {
        const tabName = message.text
        if (tabName === "projects" || tabName === "code" || tabName === "config") {
          setActiveTab(tabName as EgovViewTab)
        }
      }
    }

    window.addEventListener("message", handleMessage)
    return () => window.removeEventListener("message", handleMessage)
  }, [isReady, vscode])

  console.log('🎯 AppContent rendering EgovView with activeTab:', activeTab);

  if (!isReady) {
    return (
      <div style={{ padding: "20px", textAlign: "center" }}>
        <div style={{ marginBottom: "20px" }}>
          <span className="codicon codicon-loading codicon-modifier-spin" style={{ marginRight: "8px" }}></span>
          Initializing VSCode API...
        </div>
      </div>
    )
  }

  return (
    <EgovView 
      initialTab={activeTab} 
      onDone={() => {
        console.log('✅ AppContent onDone called');
        // VSCode에 완료 메시지 전송
        try {
          vscode?.postMessage({ command: "done" })
        } catch (error) {
          console.error('❌ Error sending done message:', error);
        }
      }} 
    />
  )
}

const App = () => {
  return (
    <VSCodeProvider>
      <AppContent />
    </VSCodeProvider>
  )
}

export default App 