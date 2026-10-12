// Úseky štafety ve stylu tratě OB: číslované kroužky, poslední dvojitý (cíl), spojené čárkovanou linkou.
export default function RouteLine({ legs, renderLeg }) {
  return (
    <div>
      {legs.map((leg, i) => (
        <div key={leg.id}>
          {i > 0 && (
            <div className="flex pl-4">
              <div className="route-line" />
            </div>
          )}
          <div className="flex items-start gap-3">
            <div className={`leg-marker ${i === legs.length - 1 ? "finish" : ""}`}>{leg.order}</div>
            <div className="flex-1 pt-1.5">{renderLeg(leg, i)}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
