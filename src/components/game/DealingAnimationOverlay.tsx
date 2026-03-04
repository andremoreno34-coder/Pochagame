interface Props {
  playerCount: number;
  hasMuestra: boolean;
}

const DIRECTIONS: Array<{ key: string; cls: string; delay: number }> = [
  { key: 'down',  cls: 'deal-card-down',  delay: 0   },
  { key: 'up',    cls: 'deal-card-up',    delay: 90  },
  { key: 'left',  cls: 'deal-card-left',  delay: 180 },
  { key: 'right', cls: 'deal-card-right', delay: 270 },
];

export function DealingAnimationOverlay({ playerCount, hasMuestra }: Props) {
  const count = Math.min(playerCount, 4);
  const directions = DIRECTIONS.slice(0, count);
  const muestraDelay = count * 90 + 60;

  return (
    <div
      className="absolute inset-0 z-30 pointer-events-none flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.38)', backdropFilter: 'blur(3px)' }}
    >
      <div className="relative flex items-center justify-center">
        <div
          style={{
            width: 56,
            height: 80,
            background: 'linear-gradient(145deg, #1e5631 0%, #0c3019 100%)',
            borderRadius: 8,
            boxShadow: '0 6px 24px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.1)',
            animation: 'deck-breathe 0.65s ease-in-out infinite alternate',
            flexShrink: 0,
          }}
        />

        {directions.map(({ key, cls, delay }) => (
          <div
            key={key}
            className={cls}
            style={{
              position: 'absolute',
              width: 42,
              height: 60,
              left: 7,
              top: 10,
              background: 'white',
              borderRadius: 5,
              boxShadow: '0 3px 14px rgba(0,0,0,0.5)',
              animationDelay: `${delay}ms`,
              opacity: 0,
            }}
          />
        ))}

        {hasMuestra && (
          <div
            className="deal-card-muestra"
            style={{
              position: 'absolute',
              width: 42,
              height: 60,
              left: 7,
              top: 10,
              background: 'white',
              borderRadius: 5,
              border: '2px solid #f59e0b',
              boxShadow: '0 3px 14px rgba(0,0,0,0.5)',
              animationDelay: `${muestraDelay}ms`,
              opacity: 0,
            }}
          />
        )}
      </div>

      <p
        className="absolute text-white/50 text-xs font-medium tracking-widest uppercase"
        style={{
          bottom: '38%',
          animation: 'fade-in-label 0.5s ease-out forwards',
          letterSpacing: '0.15em',
        }}
      >
        Repartiendo cartas
        <span
          className="inline-flex gap-1 ml-2"
          aria-hidden="true"
        >
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="inline-block w-1 h-1 rounded-full bg-white/50"
              style={{
                animation: `dealing-dot-bounce 1.2s ease-in-out infinite`,
                animationDelay: `${i * 200}ms`,
              }}
            />
          ))}
        </span>
      </p>
    </div>
  );
}
