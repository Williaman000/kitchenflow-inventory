import { useState, type FC } from 'react';
import { useTranslation } from 'react-i18next';
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
import styles from './App.module.scss';

type AppTab = 'dashboard' | 'chat' | 'trends' | 'forecast' | 'materials' | 'orders' | 'mappings';

const TAB_KEYS: AppTab[] = ['dashboard', 'chat', 'trends', 'forecast', 'materials', 'orders', 'mappings'];

const LANG_LABELS: Record<string, string> = { ko: '한국어', ja: '日本語' };

const App: FC = () => {
	const { t, i18n } = useTranslation();
	const auth = useAuth();
	const [activeTab, setActiveTab] = useState<AppTab>('dashboard');

	const toggleLang = () => {
		const next = i18n.language === 'ja' ? 'ko' : 'ja';
		i18n.changeLanguage(next);
	};

	const chatHook = useChat();
	const trendsHook = useSalesTrends(auth.isAuthenticated);
	const forecastHook = useForecast(auth.isAuthenticated);
	const inventoryHook = useInventory();
	const mappingsHook = useMappings();
	const dashboardHook = useDashboard();

	// 로딩 중 (토큰 검증)
	if (auth.isLoading) {
		return (
			<div className={styles.loadingScreen}>
				<div className={styles.loadingIcon}>AI</div>
				<p className={styles.loadingText}>{t('app.loading')}</p>
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
		<div className={styles.layout}>
			{/* 헤더 */}
			<header className={styles.header}>
				<div className={styles.headerLeft}>
					<div className={styles.logoIcon}>AI</div>
					<h1 className={styles.headerTitle}>{t('app.title')}</h1>
				</div>
				<div className={styles.headerRight}>
					<button className={styles.langBtn} onClick={toggleLang}>
						{LANG_LABELS[i18n.language] ?? '한국어'}
					</button>
					{auth.user && (
						<span className={styles.userName}>{auth.user.name}</span>
					)}
					<button className={styles.logoutBtn} onClick={auth.logout}>
						{t('app.logout')}
					</button>
				</div>
			</header>

			{/* 탭 네비게이션 */}
			<nav className={styles.tabNav}>
				{TAB_KEYS.map((tab) => (
					<button
						key={tab}
						className={activeTab === tab ? styles.tabActive : styles.tab}
						onClick={() => setActiveTab(tab)}
					>
						{t(`tabs.${tab}`)}
					</button>
				))}
			</nav>

			{/* 메인 콘텐츠 */}
			<div className={activeTab === 'chat' ? styles.chatContent : styles.mainContent}>
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
						onRefresh={trendsHook.refresh}
						uploads={trendsHook.uploads}
						uploadsLoading={trendsHook.uploadsLoading}
						onDeleteUpload={trendsHook.handleDeleteUpload}
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
						onBulkImport={inventoryHook.handleBulkImport}
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
};

export default App;
