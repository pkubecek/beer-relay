// Renders a vertical sequence of legs styled like an orienteering course:
// triangle start -> numbered circles -> double-circle finish, joined by a dashed route line.
export default function RouteLine({ legs, renderLeg }) {
  return (
    <div>
      <div className="flex items-center gap-3 mb-1">
        <div
          className="w-9 h-9 shrink-0"
          style={{
            clipPath: "polygon(50% 0%, 0% 100%, 100% 100%)",
            background: "#F2C744",
            border: "2px solid #1F2A1C",
          }}
          title="Start"
        />
        <span className="text-xs font-mono uppercase tracking-widest text-wood">Start</span>
      </div>
      {legs.map((leg, i) => (
        <div key={leg.id}>
          <div className="flex pl-4">
            <div className="route-line" />
          </div>
          <div className="flex items-start gap-3">
            <div className={`leg-marker ${i === legs.length - 1 ? "finish" : ""}`}>{leg.order}</div>
            <div className="flex-1 pt-1.5">{renderLeg(leg, i)}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
