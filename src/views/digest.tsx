import { retriesWarn, statusWarn } from '../digest/flags.js';
import type { Night } from '../digest/types.js';

const dash = (v: string | null) => (v === null || v === '' ? '—' : v);

export function DigestPage({ night }: { night: Night }) {
  return (
    <>
      <h1>digest · {night.night}</h1>
      {night.badLines > 0 && (
        <p class="mute">
          {night.badLines} {night.badLines === 1 ? 'line' : 'lines'} didn't parse
        </p>
      )}
      {night.rows.length === 0 ? (
        <p class="mute">nothing ran</p>
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
            {night.rows.map((r) => (
              <tr>
                <td>{r.job}</td>
                <td>{dash(r.owner)}</td>
                <td>{r.runs}</td>
                <td class={retriesWarn(r) ? 'warn' : undefined}>{r.retries}</td>
                <td class={statusWarn(r) ? 'warn' : undefined}>{r.lastStatus}</td>
                <td>{dash(r.lastError)}</td>
                <td>{dash(r.firstAt)}</td>
                <td>{dash(r.lastAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
