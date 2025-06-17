import { useState, useEffect, memo } from "react"
import { EgovViewTab } from "../../App"
import ProjectsView from "./tabs/ProjectsView"
import CodeView from "./tabs/CodeView"
import ConfigView from "./tabs/ConfigView"

interface EgovViewProps {
	onDone: () => void
	initialTab?: EgovViewTab
}

const EgovView = memo(({ onDone, initialTab }: EgovViewProps) => {
	console.log('🎯 EgovView rendering with initialTab:', initialTab);
	
	const [activeTab, setActiveTab] = useState<EgovViewTab>(initialTab || "projects")

	const handleTabChange = (tab: EgovViewTab) => {
		console.log('🔄 Tab changing to:', tab);
		setActiveTab(tab)
	}

	useEffect(() => {
		console.log('🔧 EgovView useEffect running...');
		
		// 탭 전환 메시지 리스너 추가
		const handleMessage = (event: MessageEvent) => {
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
	}, [])

	console.log('📋 EgovView current activeTab:', activeTab);

	return (
		<div style={{
			width: "100%",
			height: "100vh",
			display: "flex",
			flexDirection: "column",
			background: "var(--vscode-sideBar-background, #252526)",
			color: "var(--vscode-sideBar-foreground, #ffffff)",
			fontFamily: "var(--vscode-font-family, 'Segoe UI', sans-serif)",
			fontSize: "13px"
		}}>
			{/* Header */}
			<div style={{
				padding: "8px 12px",
				borderBottom: "1px solid var(--vscode-sideBarSectionHeader-border, #2b2b2b)",
				background: "var(--vscode-sideBarSectionHeader-background, #2d2d30)"
			}}>
				<h3 style={{ 
					color: "var(--vscode-sideBarTitle-foreground, #ffffff)", 
					margin: 0,
					fontSize: "11px",
					fontWeight: "600",
					textTransform: "uppercase",
					letterSpacing: "0.5px"
				}}>
					🚀 eGOVFRAME INITIALIZR
				</h3>
			</div>

			{/* Tabs container - 수평 탭 스타일로 변경 */}
			<div style={{
				display: "flex",
				flexDirection: "row", // 수평으로 변경
				borderBottom: "1px solid var(--vscode-sideBarSectionHeader-border, #2b2b2b)",
				background: "var(--vscode-sideBar-background, #252526)",
				overflow: "hidden"
			}}>
				<TabButton 
					isActive={activeTab === "projects"} 
					onClick={() => handleTabChange("projects")}
				>
					📦 Projects
				</TabButton>
				<TabButton 
					isActive={activeTab === "code"} 
					onClick={() => handleTabChange("code")}
				>
					💻 Code Generator
				</TabButton>
				<TabButton 
					isActive={activeTab === "config"} 
					onClick={() => handleTabChange("config")}
				>
					⚙️ Configuration
				</TabButton>
			</div>

			{/* Content container - 실제 컴포넌트들 렌더링 */}
			<div style={{ 
				flex: 1, 
				overflow: "auto"
			}}>
				{activeTab === "projects" && (
					<div style={{ 
						padding: "12px",
						background: "var(--vscode-sideBar-background, #252526)"
					}}>
						<ProjectsView />
					</div>
				)}
				{activeTab === "code" && (
					<div style={{ 
						padding: "12px",
						background: "var(--vscode-sideBar-background, #252526)"
					}}>
						<CodeView />
					</div>
				)}
				{activeTab === "config" && (
					<div style={{ 
						padding: "12px",
						background: "var(--vscode-sideBar-background, #252526)"
					}}>
						<ConfigView />
					</div>
				)}
			</div>
		</div>
	)
})

const TabButton = ({
	children,
	isActive,
	onClick,
}: {
	children: React.ReactNode
	isActive: boolean
	onClick: () => void
}) => (
	<button 
		onClick={onClick}
		style={{
			flex: 1, // 각 탭이 동일한 크기를 가지도록
			background: isActive 
				? "var(--vscode-tab-activeBackground, #1e1e1e)" 
				: "var(--vscode-tab-inactiveBackground, #2d2d30)",
			border: "none",
			borderTop: isActive 
				? "2px solid var(--vscode-tab-activeBorder, #007acc)" 
				: "2px solid transparent",
			borderRight: "1px solid var(--vscode-sideBarSectionHeader-border, #2b2b2b)",
			color: isActive 
				? "var(--vscode-tab-activeForeground, #ffffff)" 
				: "var(--vscode-tab-inactiveForeground, #969696)",
			padding: "8px 4px",
			cursor: "pointer",
			fontSize: "10px",
			textAlign: "center",
			fontFamily: "inherit",
			transition: "all 0.1s ease",
			whiteSpace: "nowrap",
			overflow: "hidden",
			textOverflow: "ellipsis"
		}}
		onMouseOver={(e) => {
			if (!isActive) {
				e.currentTarget.style.background = "var(--vscode-tab-hoverBackground, #1e1e1e)";
				e.currentTarget.style.color = "var(--vscode-tab-hoverForeground, #ffffff)";
			}
		}}
		onMouseOut={(e) => {
			if (!isActive) {
				e.currentTarget.style.background = "var(--vscode-tab-inactiveBackground, #2d2d30)";
				e.currentTarget.style.color = "var(--vscode-tab-inactiveForeground, #969696)";
			}
		}}
	>
		{children}
	</button>
)

EgovView.displayName = "EgovView"

export default EgovView 