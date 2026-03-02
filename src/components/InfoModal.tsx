import { useTranslation } from 'react-i18next';
import './InfoModal.css';

interface Props {
  onClose: () => void;
}

export default function InfoModal({ onClose }: Props) {
  const { t } = useTranslation();

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal info-modal" onClick={(e) => e.stopPropagation()}>
        <div className="info-header">
          <h2>{t('info.title')}</h2>
          <button className="btn btn-ghost info-close" onClick={onClose}>✕</button>
        </div>

        <div className="info-body">
          <section>
            <h3>{t('info.overviewTitle')}</h3>
            <p>{t('info.overviewText')}</p>
          </section>

          <section>
            <h3>{t('info.cardsTitle')}</h3>
            <ul>
              <li>{t('info.cards1')}</li>
              <li>{t('info.cards2')}</li>
              <li>{t('info.cards3')}</li>
            </ul>
          </section>

          <section>
            <h3>{t('info.roundsTitle')}</h3>
            <p>{t('info.roundsText1')}</p>
            <p>{t('info.roundsText2')}</p>
          </section>

          <section>
            <h3>{t('info.flowTitle')}</h3>
            <ol>
              <li>{t('info.flow1')}</li>
              <li>{t('info.flow2')}</li>
              <li>{t('info.flow3')}</li>
              <li>{t('info.flow4')}</li>
            </ol>
          </section>

          <section>
            <h3>{t('info.trickRulesTitle')}</h3>
            <ul>
              <li>{t('info.trick1')}</li>
              <li>{t('info.trick2')}</li>
              <li>{t('info.trick3')}</li>
              <li>{t('info.trick4')}</li>
              <li>{t('info.trick5')}</li>
            </ul>
          </section>

          <section>
            <h3>{t('info.scoringTitle')}</h3>
            <ul>
              <li>{t('info.scoring1')}</li>
              <li>{t('info.scoring2')}</li>
              <li>{t('info.scoring3')}</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
