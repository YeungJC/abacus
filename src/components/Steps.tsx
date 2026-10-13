import { useT } from "../store";

export default function Steps() {
  const { t } = useT();
  return (
    <section className="panel">
      <div className="wrap">
        <div className="sec-head">
          <span className="seal">三</span>
          <div><h2>{t("steps.h")}</h2></div>
        </div>
        <ol className="steps">
          {(["一", "二", "三"] as const).map((n, i) => (
            <li key={n}>
              <span className="num">{n}</span>
              <div><h3>{t(`s${i + 1}.h`)}</h3><p>{t(`s${i + 1}.p`)}</p></div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
