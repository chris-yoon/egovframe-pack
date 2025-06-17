import { VSCodeButton } from "@vscode/webview-ui-toolkit/react"
import { useState, useEffect, memo } from "react"
import styled from "styled-components"
import { EgovViewTab } from "../../shared/egovframe"
import ProjectsView from "./tabs/ProjectsView"
import CodeView from "./tabs/CodeView"
import ConfigView from "./tabs/ConfigView"

interface EgovViewProps {
	onDone: () => void
	initialTab?: EgovViewTab
}

const EgovView = memo(({ onDone, initialTab }: EgovViewProps) => {
	const [activeTab, setActiveTab] = useState<EgovViewTab>(initialTab || "projects")

	const handleTabChange = (tab: EgovViewTab) => {
		setActiveTab(tab)
	}

	useEffect(() => {
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

	return (
		<div
			style={{
				position: "fixed",
				top: 0,
				left: 0,
				right: 0,
				bottom: 0,
				display: "flex",
				flexDirection: "column",
			}}>
			<div
				style={{
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center",
					padding: "10px 17px 5px 20px",
				}}>
				<h3 style={{ color: "var(--vscode-foreground)", margin: 0 }}>eGovFrame Initializr</h3>
				<VSCodeButton onClick={onDone}>Done</VSCodeButton>
			</div>

			<div style={{ flex: 1, overflow: "auto" }}>
				{/* Tabs container */}
				<div
					style={{
						display: "flex",
						gap: "1px",
						padding: "0 20px 0 20px",
						borderBottom: "1px solid var(--vscode-panel-border)",
					}}>
					<TabButton isActive={activeTab === "projects"} onClick={() => handleTabChange("projects")}>
						Projects
					</TabButton>
					<TabButton isActive={activeTab === "code"} onClick={() => handleTabChange("code")}>
						Code Generator
					</TabButton>
					<TabButton isActive={activeTab === "config"} onClick={() => handleTabChange("config")}>
						Configuration
					</TabButton>
				</div>

				{/* Content container */}
				<div style={{ width: "100%" }}>
					{activeTab === "projects" && <ProjectsView />}
					{activeTab === "code" && <CodeView />}
					{activeTab === "config" && <ConfigView />}
				</div>
			</div>
		</div>
	)
})

const StyledTabButton = styled.button<{ isActive: boolean }>`
	background: none;
	border: none;
	border-bottom: 2px solid ${(props) => (props.isActive ? "var(--vscode-foreground)" : "transparent")};
	color: ${(props) => (props.isActive ? "var(--vscode-foreground)" : "var(--vscode-descriptionForeground)")};
	padding: 8px 16px;
	cursor: pointer;
	font-size: 13px;
	margin-bottom: -1px;
	font-family: inherit;

	&:hover {
		color: var(--vscode-foreground);
	}
`

export const TabButton = ({
	children,
	isActive,
	onClick,
}: {
	children: React.ReactNode
	isActive: boolean
	onClick: () => void
}) => (
	<StyledTabButton isActive={isActive} onClick={onClick}>
		{children}
	</StyledTabButton>
)

EgovView.displayName = "EgovView"

export default EgovView 