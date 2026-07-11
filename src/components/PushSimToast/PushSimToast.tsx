import { type FC } from 'react';
import { useTranslation, getI18n } from 'react-i18next';
import styles from './PushSimToast.module.scss';

interface Props {
	urgentCount: number;
	/** Deadline display string from the forecast (e.g. "本日 18:00まで発注"). */
	deadlineDisplay: string;
	/** Place the order now — navigates to the forecast tab. */
	onAction: () => void;
	/** Dismiss the push simulation. */
	onClose: () => void;
}

function useNow() {
	const now = new Date();
	const lang = getI18n().language === 'ja' ? 'ja-JP' : 'ko-KR';
	const time = now.toLocaleTimeString(lang, { hour: '2-digit', minute: '2-digit', hour12: false });
	const date = now.toLocaleDateString(lang, { month: 'long', day: 'numeric', weekday: 'long' });
	return { time, date };
}

/**
 * Simulated smartphone lock-screen push notification for order deadlines.
 * Demo/portfolio mock — there is no real push infrastructure (FCM/APNs); this
 * visualizes the "manager gets a phone alert" story purely in the UI.
 */
const PushSimToast: FC<Props> = ({ urgentCount, deadlineDisplay, onAction, onClose }) => {
	const { t } = useTranslation();
	const { time, date } = useNow();

	return (
		<div className={styles.overlay}>
			<div className={styles.phone}>
				<div className={styles.screen}>
					<div className={styles.notch} />
					<div className={styles.statusBar}>
						<span>{time}</span>
						<span>📶 🔋</span>
					</div>

					<div className={styles.lockClock}>
						<div className={styles.lockTime}>{time}</div>
						<div className={styles.lockDate}>{date}</div>
					</div>

					<div className={styles.notif}>
						<div className={styles.appIcon}>🍗</div>
						<div className={styles.notifBody}>
							<div className={styles.notifMeta}>
								<span className={styles.notifApp}>{t('alerts.pushAppName')}</span>
								<span className={styles.notifTime}>{t('alerts.pushNowLabel')}</span>
							</div>
							<p className={styles.notifTitle}>{t('alerts.urgentTitle')}</p>
							<p className={styles.notifText}>
								{t('alerts.urgentBody', { count: urgentCount })}
								{deadlineDisplay && (
									<>
										{' '}
										<span className={styles.notifDeadline}>{deadlineDisplay}</span>
									</>
								)}
							</p>
						</div>
					</div>

					<div className={styles.cta}>
						<button className={styles.ctaOrder} onClick={onAction}>{t('alerts.pushNow')}</button>
						<button className={styles.ctaClose} onClick={onClose}>{t('alerts.later')}</button>
					</div>
				</div>
			</div>
			<p className={styles.simCaption}>{t('alerts.pushSent')}</p>
		</div>
	);
};

export default PushSimToast;
