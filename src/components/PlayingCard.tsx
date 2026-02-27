import { motion } from 'framer-motion';
import type { Card, Suit } from '../types';
import './PlayingCard.css';

// Map server's plural suit names to singular for image file paths
const SUIT_TO_FILE: Record<Suit, string> = {
  spades: 'spade',
  hearts: 'heart',
  diamonds: 'diamond',
  clubs: 'club',
};

function getCardImageUrl(suit: Suit, rank: string): string {
  return `/cards/${SUIT_TO_FILE[suit]}_${rank}.png`;
}

interface Props {
  card: Card;
  onClick?: () => void;
  disabled?: boolean;
  highlight?: boolean;
  small?: boolean;
  winner?: boolean;
  dealDelay?: number;
}

export default function PlayingCard({ card, onClick, disabled, highlight, small, winner, dealDelay }: Props) {
  const isRed = card.suit === 'hearts' || card.suit === 'diamonds';
  const size = small ? 'sm' : 'md';

  const cardClasses = [
    'playing-card',
    `card-${size}`,
    'face-up',
    isRed ? 'red' : 'black',
    highlight ? 'highlighted' : '',
    disabled ? 'dimmed' : '',
    winner ? 'winner' : '',
    card.suit === 'hearts' && highlight ? 'heart-highlight' : '',
    onClick && !disabled ? 'clickable' : '',
  ].filter(Boolean).join(' ');

  const cardContent = (
    <div className="card-flip-inner">
      {/* Front face (card image) — shown when face-up via rotateY(180deg) */}
      <div className="card-face-img">
        <img
          src={getCardImageUrl(card.suit, card.rank)}
          alt={`${card.rank} of ${card.suit}`}
          className="card-image"
          draggable={false}
        />
      </div>

      {/* Back face — shown by default */}
      <div className="card-back">
        <img
          src="/cards/back.png"
          alt="card back"
          className="back-image"
          draggable={false}
        />
      </div>
    </div>
  );

  if (dealDelay !== undefined) {
    return (
      <motion.div
        className={cardClasses}
        onClick={!disabled && onClick ? onClick : undefined}
        initial={{ opacity: 0, y: 50, scale: 0.6, rotateZ: -5 + Math.random() * 10 }}
        animate={{ opacity: 1, y: 0, scale: 1, rotateZ: 0 }}
        transition={{
          duration: 0.4,
          delay: dealDelay,
          type: 'spring',
          stiffness: 220,
          damping: 22,
        }}
      >
        {cardContent}
      </motion.div>
    );
  }

  return (
    <div className={cardClasses} onClick={!disabled && onClick ? onClick : undefined}>
      {cardContent}
    </div>
  );
}

export function CardBack({ small }: { small?: boolean }) {
  return (
    <div className={`playing-card card-${small ? 'sm' : 'md'} face-down`}>
      <div className="card-flip-inner">
        <div className="card-face-img" />
        <div className="card-back">
          <img src="/cards/back.png" alt="card back" className="back-image" draggable={false} />
        </div>
      </div>
    </div>
  );
}
