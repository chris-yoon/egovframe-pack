import { useState, useEffect } from "react"
import EgovView from "./components/egov/EgovView"

export type EgovViewTab = "projects" | "code" | "config"

declare global {
  function acquireVsCodeApi(): {
    postMessage: (message: any) => void
    getState: () => any
    setState: (state: any) => void
  }
}

const App = () => {
  console.log('📱 App component rendering...');
  
  const [activeTab, setActiveTab] = useState<EgovViewTab>("projects")

  useEffect(() => {
    console.log('🔧 App useEffect running...');
    
    // VSCode API 초기화
    try {
      const vscode = acquireVsCodeApi()
      console.log('✅ VSCode API acquired:', vscode);
      
      // 메시지 리스너 추가
      const handleMessage = (event: MessageEvent) => {
        console.log('📨 Received message in App:', event.data);
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
    } catch (error) {
      console.error('❌ Error in App useEffect:', error);
    }
  }, [])

  console.log('🎯 App rendering EgovView with activeTab:', activeTab);

  return (
    <EgovView 
      initialTab={activeTab} 
      onDone={() => {
        console.log('✅ App onDone called');
        // VSCode에 완료 메시지 전송
        try {
          acquireVsCodeApi().postMessage({ command: "done" })
        } catch (error) {
          console.error('❌ Error sending done message:', error);
        }
      }} 
    />
  )
}

export default App 