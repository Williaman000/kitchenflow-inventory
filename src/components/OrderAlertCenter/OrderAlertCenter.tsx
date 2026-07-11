import { useState, useRef, useEffect, type FC } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './OrderAlertCenter.module.scss';

interface Props {
	/** Number of materials whose order deadline is imminent. */
	urgentCount: number;
	/** Deadline display string from the forecast (e.g. "本日 18:00まで発注"). */
	deadlineDisplay: string;
	/** Whether the alert has been dismissed (read) this session. */
	isRead: boolean;
	/** Navigate to the forecast tab to place the order. */
	onGoToForecast: () => void;
	/** Mark the alert as read. */
	onMarkRead: () => void;
}

/**
 * Bell-style alert center in the header. Surfaces imminent order deadlines
 * as an in-app notification list. Demo/portfolio mock — no real backend push.
 */
const OrderAlertCenter: FC<Props> = ({ urgentCount, deadlineDisplay, isRead, onGoToForecast, onMarkRead }) => {
	const { t } = useTranslation();
	const [open, setOpen] = useState(false);
	const wrapRef = useRef<HTMLDivElement>(null);

	const hasAlert = urgentCount > 0 && !isRead;

	// Close on outside click
	useEffect(() => {
		if (!open) return;
		const handler = (e: MouseEvent) => {
			if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
				setOpen(false);
			}
		};
		document.addEventListener('mousedown', handler);
		return () => document.removeEventListener('mousedown', handler);
	}, [open]);

	const handleOrder = () => {
		setOpen(false);
		onGoToForecast();
	};

	const handleRead = () => {
		onMarkRead();
		setOpen(false);
	};

	return (
		<div className={styles.wrap} ref={wrapRef}>
			<button
				className={`${styles.bellBtn} ${hasAlert ? styles.bellBtnActive : ''}`}
				onClick={() => setOpen((v) => !v)}
				aria-label={t('alerts.bellTitle')}
			>
				🔔
				{hasAlert && <span className={styles.countBadge}>{urgentCount}</span>}
			</button>

			{open && (
				<div className={styles.dropdown}>
					<div className={styles.dropHeader}>
						<h3 className={styles.dropTitle}>{t('alerts.bellTitle')}</h3>
						{hasAlert && <span className={styles.dropCount}>{t('alerts.newCount', { count: urgentCount })}</span>}
					</div>
					<div className={styles.list}>
						{hasAlert ? (
							<div className={styles.item}>
								<div className={styles.itemIcon}>⏰</div>
								<div className={styles.itemBody}>
									<p className={styles.itemTitle}>{t('alerts.urgentTitle')}</p>
									<p className={styles.itemText}>
										{t('alerts.urgentBody', { count: urgentCount })}
										{deadlineDisplay && (
											<>
												<br />
												<span className={styles.itemDeadline}>{deadlineDisplay}</span>
											</>
										)}
									</p>
									<div className={styles.itemActions}>
										<button className={styles.orderBtn} onClick={handleOrder}>{t('alerts.pushNow')}</button>
										<button className={styles.readBtn} onClick={handleRead}>{t('alerts.markRead')}</button>
									</div>
								</div>
							</div>
						) : (
							<p className={styles.empty}>{t('alerts.empty')}</p>
						)}
					</div>
				</div>
			)}
		</div>
	);
};

export default OrderAlertCenter;
