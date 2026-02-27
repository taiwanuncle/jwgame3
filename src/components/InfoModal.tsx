import './InfoModal.css';

interface Props {
  onClose: () => void;
}

export default function InfoModal({ onClose }: Props) {
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal info-modal" onClick={(e) => e.stopPropagation()}>
        <div className="info-header">
          <h2>예(Yeah!!) 게임 규칙</h2>
          <button className="btn btn-ghost info-close" onClick={onClose}>✕</button>
        </div>

        <div className="info-body">
          <section>
            <h3>게임 개요</h3>
            <p>트릭테이킹 카드 게임으로, 3~7명이 플레이합니다. 매 라운드 자신이 이길 트릭 수를 예측하고, 정확히 맞추면 점수를 얻습니다.</p>
          </section>

          <section>
            <h3>카드</h3>
            <ul>
              <li>52장 표준 포커 덱 사용</li>
              <li>카드 순위: A(최강) &gt; K &gt; Q &gt; J &gt; 10 &gt; ... &gt; 2</li>
              <li>♥ 하트 = 영구 트럼프 (항상 다른 무늬를 이김)</li>
            </ul>
          </section>

          <section>
            <h3>라운드 구성</h3>
            <p>라운드별 카드 수: 1→2→...→N→...→2→1 (N=플레이어 수)</p>
            <p>예: 4명이면 1,2,3,4,3,2,1 = 총 7라운드</p>
          </section>

          <section>
            <h3>게임 진행</h3>
            <ol>
              <li><strong>선 결정:</strong> 첫 라운드는 주사위, 이후는 시계방향 회전</li>
              <li><strong>예측:</strong> 카드를 보고 이길 트릭 수를 동시에 선택 → 동시 공개</li>
              <li><strong>트릭 플레이:</strong> 선부터 시계방향으로 카드 1장씩</li>
              <li><strong>점수 계산:</strong> 예측 적중 시 10 + 트릭 수 | 실패 시 0점</li>
            </ol>
          </section>

          <section>
            <h3>트릭 규칙</h3>
            <ul>
              <li>리드 무늬를 반드시 따라가기 (없으면 아무 카드)</li>
              <li>♥ 트럼프는 항상 리드 무늬를 이김</li>
              <li>같은 무늬면 높은 숫자가 승리</li>
              <li>트릭 승자가 다음 트릭의 선</li>
            </ul>
          </section>

          <section>
            <h3>점수</h3>
            <ul>
              <li>예측 성공: <strong>10 + 이긴 트릭 수</strong></li>
              <li>예측 실패: <strong>0점</strong></li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
