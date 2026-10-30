import type { NightDigest } from '../digest/types.js';

const dash = (v: string | number | null | undefined) =>
  v === null || v === undefined || v === '' ? '—' : String(v);

export function DigestTable({ night, digest }: { night: string; digest: NightDigest }) {
  return (
    <section>
      <h1>digest · {night}</h1>
      {digest.rows.length === 0 ? (
        <p>nothing ran</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>job</th>
              <th>owner</th>
              <th>runs</th>
              <th>retries</th>
              <th>last status</th>
              <th>last error</th>
              <th>first</th>
              <th>last</th>
            </tr>
          </thead>
          <tbody>
            {digest.rows.map((r) => (
              <tr class={r.retries >= 3 || r.lastStatus === 'fail' ? 'warn' : undefined}>
                <td>{dash(r.job)}</td>
                <td>{dash(r.owner)}</td>
                <td>{dash(r.runs)}</td>
                <td>{dash(r.retries)}</td>
                <td>{dash(r.lastStatus)}</td>
                <td>{dash(r.lastError)}</td>
                <td>{dash(r.first)}</td>
                <td>{dash(r.last)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {digest.badLines > 0 && <p>{digest.badLines} line(s) did not parse</p>}
    </section>
  );
}
