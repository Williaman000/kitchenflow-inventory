import { useState } from 'react';
import { useAuth } from './hooks/useAuth';
import { useChat } from './hooks/useChat';
import { useSalesTrends } from './hooks/useSalesTrends';
import { useForecast } from './hooks/useForecast';
import { useInventory } from './hooks/useInventory';
import { useMappings } from './hooks/useMappings';
import { useDashboard } from './hooks/useDashboard';
import LoginScreen from './components/LoginScreen';
import Dashboard from './components/Dashboard';
import AIChatInterface from './components/AIChatInterface';
import SalesTrends from './components/SalesTrends';
import ForecastPage from './components/ForecastPage';
import MaterialManager from './components/MaterialManager';
import PurchaseOrderManager from './components/PurchaseOrderManager';
import MappingManager from './components/MappingManager';
import { COLORS } from './constants/theme';

type AppTab = 'dashboard' | 'chat' | 'trends' | 'forecast' | 'materials' | 'orders' | 'mappings';

const TAB_LABELS: Record<AppTab, string> = {
	dashboard: '대시보드',
	chat: 'AI 챗봇',
	trends: '매출분석',
	forecast: 'AI 발주추천',
	materials: '재료관리',
	orders: '발주관리',
	mappings: '재료매핑',
};

export default function App() {
	const auth = useAuth();
	const [activeTab, setActiveTab] = useState<AppTab>('dashboard');

	const chatHook = useChat();
	const trendsHook = useSalesTrends();
	const forecastHook = useForecast();
	const inventoryHook = useInventory();
	const mappingsHook = useMappings();
	const dashboardHook = useDashboard();

	// 로딩 중 (토큰 검증)
	if (auth.isLoading) {
		return (
			<div style={styles.loadingScreen}>
				<div style={styles.loadingIcon}>AI</div>
				<p style={{ color: COLORS.textMuted, marginTop: 12 }}>로딩 중...</p>
			</div>
		);
	}

	// 미인증 → 로그인 화면
	if (!auth.isAuthenticated) {
		return <LoginScreen onLogin={auth.login} />;
	}

	const navigateTab = (tab: string) => {
		setActiveTab(tab as AppTab);
	};

	return (
		<div style={styles.layout}>
			{/* 헤더 */}
			<header style={styles.header}>
				<div style={styles.headerLeft}>
					<div style={styles.logoIcon}>AI</div>
					<h1 style={styles.headerTitle}>KitchenFlow AI 재고관리</h1>
				</div>
				<div style={styles.headerRight}>
					{auth.user && (
						<span style={styles.userName}>{auth.user.name}</span>
					)}
					<button style={styles.logoutBtn} onClick={auth.logout}>
						로그아웃
					</button>
				</div>
			</header>

			{/* 탭 네비게이션 */}
			<nav style={styles.tabNav}>
				{(Object.keys(TAB_LABELS) as AppTab[]).map((tab) => (
					<button
						key={tab}
						style={activeTab === tab ? styles.tabActive : styles.tab}
						onClick={() => setActiveTab(tab)}
					>
						{TAB_LABELS[tab]}
					</button>
				))}
			</nav>

			{/* 메인 콘텐츠 */}
			<div style={activeTab === 'chat' ? styles.chatContent : styles.mainContent}>
				{activeTab === 'dashboard' && (
					<Dashboard
						stats={dashboardHook.stats}
						isLoading={dashboardHook.isLoading}
						error={dashboardHook.error}
						onLoad={dashboardHook.loadDashboard}
						onNavigate={navigateTab}
					/>
				)}
				{activeTab === 'chat' && (
					<AIChatInterface
						messages={chatHook.messages}
						isLoading={chatHook.isLoading}
						onSendMessage={chatHook.sendMessage}
						onClear={chatHook.clearMessages}
					/>
				)}
				{activeTab === 'trends' && (
					<SalesTrends
						data={trendsHook.data}
						period={trendsHook.period}
						isLoading={trendsHook.isLoading}
						error={trendsHook.error}
						onPeriodChange={trendsHook.changePeriod}
					/>
				)}
				{activeTab === 'forecast' && (
					<ForecastPage
						forecast={forecastHook.forecast}
						forecastDays={forecastHook.forecastDays}
						isLoading={forecastHook.isLoading}
						error={forecastHook.error}
						onLoadForecast={forecastHook.loadForecast}
						onCreatePO={inventoryHook.handleCreatePO}
					/>
				)}
				{activeTab === 'materials' && (
					<MaterialManager
						materials={inventoryHook.materials}
						allMaterials={inventoryHook.allMaterials}
						materialCategories={inventoryHook.materialCategories}
						materialCategoryFilter={inventoryHook.materialCategoryFilter}
						onCategoryFilterChange={inventoryHook.setMaterialCategoryFilter}
						lowStockCount={inventoryHook.lowStockCount}
						isLoading={inventoryHook.isLoading}
						error={inventoryHook.error}
						onLoad={inventoryHook.loadMaterials}
						onCreateMaterial={inventoryHook.handleCreateMaterial}
						onUpdateMaterial={inventoryHook.handleUpdateMaterial}
						onDeleteMaterial={inventoryHook.handleDeleteMaterial}
						onAdjustInventory={inventoryHook.handleAdjustInventory}
					/>
				)}
				{activeTab === 'orders' && (
					<PurchaseOrderManager
						purchaseOrders={inventoryHook.purchaseOrders}
						materials={inventoryHook.allMaterials}
						poStatusFilter={inventoryHook.poStatusFilter}
						onStatusFilterChange={inventoryHook.setPoStatusFilter}
						isLoading={inventoryHook.isLoading}
						error={inventoryHook.error}
						onLoad={inventoryHook.loadPurchaseOrders}
						onLoadMaterials={inventoryHook.loadMaterials}
						onCreatePO={inventoryHook.handleCreatePO}
						onUpdatePOStatus={inventoryHook.handleUpdatePOStatus}
					/>
				)}
				{activeTab === 'mappings' && (
					<MappingManager
						mappings={mappingsHook.mappings}
						products={mappingsHook.products}
						materials={inventoryHook.allMaterials}
						isLoading={mappingsHook.isLoading}
						error={mappingsHook.error}
						onLoadMappings={mappingsHook.loadMappings}
						onLoadProducts={mappingsHook.loadProducts}
						onLoadMaterials={inventoryHook.loadMaterials}
						onCreate={mappingsHook.handleCreate}
						onUpdate={mappingsHook.handleUpdate}
						onDelete={mappingsHook.handleDelete}
					/>
				)}
			</div>
		</div>
	);
}

const styles: Record<string, React.CSSProperties> = {
	loadingScreen: {
		display: 'flex',
		flexDirection: 'column',
		justifyContent: 'center',
		alignItems: 'center',
		height: '100vh',
		backgroundColor: COLORS.background,
	},
	loadingIcon: {
		display: 'inline-flex',
		alignItems: 'center',
		justifyContent: 'center',
		width: 56,
		height: 56,
		borderRadius: 14,
		backgroundColor: COLORS.primary,
		color: COLORS.white,
		fontSize: 20,
		fontWeight: 900,
	},
	layout: {
		display: 'flex',
		flexDirection: 'column',
		height: '100vh',
		backgroundColor: COLORS.background,
	},
	header: {
		display: 'flex',
		justifyContent: 'space-between',
		alignItems: 'center',
		backgroundColor: COLORS.primary,
		color: COLORS.white,
		height: 56,
		padding: '0 24px',
		flexShrink: 0,
	},
	headerLeft: {
		display: 'flex',
		alignItems: 'center',
		gap: 10,
	},
	logoIcon: {
		display: 'inline-flex',
		alignItems: 'center',
		justifyContent: 'center',
		width: 32,
		height: 32,
		borderRadius: 8,
		backgroundColor: 'rgba(255,255,255,0.2)',
		fontSize: 12,
		fontWeight: 900,
	},
	headerTitle: {
		fontSize: 18,
		fontWeight: 800,
		margin: 0,
	},
	headerRight: {
		display: 'flex',
		alignItems: 'center',
		gap: 12,
	},
	userName: {
		fontSize: 13,
		backgroundColor: 'rgba(255,255,255,0.15)',
		padding: '4px 12px',
		borderRadius: 20,
		fontWeight: 500,
	},
	logoutBtn: {
		backgroundColor: 'rgba(255,255,255,0.15)',
		color: COLORS.white,
		border: '1px solid rgba(255,255,255,0.3)',
		padding: '6px 14px',
		borderRadius: 20,
		fontSize: 12,
		fontWeight: 600,
		cursor: 'pointer',
	},
	tabNav: {
		display: 'flex',
		backgroundColor: COLORS.white,
		borderBottom: `1px solid ${COLORS.borderDark}`,
		flexShrink: 0,
		overflowX: 'auto',
	},
	tab: {
		flex: 1,
		padding: '12px 4px',
		border: 'none',
		borderBottom: '3px solid transparent',
		backgroundColor: 'transparent',
		fontSize: 13,
		fontWeight: 500,
		color: COLORS.textMuted,
		cursor: 'pointer',
		whiteSpace: 'nowrap',
	},
	tabActive: {
		flex: 1,
		padding: '12px 4px',
		border: 'none',
		borderBottom: `3px solid ${COLORS.primary}`,
		backgroundColor: 'transparent',
		fontSize: 13,
		fontWeight: 700,
		color: COLORS.primary,
		cursor: 'pointer',
		whiteSpace: 'nowrap',
	},
	mainContent: {
		flex: 1,
		overflow: 'auto',
	},
	chatContent: {
		flex: 1,
		overflow: 'hidden',
		display: 'flex',
		flexDirection: 'column',
	},
};
