export type Status = 'ok' | 'retry' | 'fail';

// One row per job for a night. Times are the log's `at` strings, offset kept as written.
export type DigestRow = {
  job: string;
  owner: string | null;
  runs: number; // valid lines for this job
  retries: number; // lines with status `retry`
  lastStatus: Status;
  lastError: string | null; // most recent `error` seen for this job, if any
  first: string;
  last: string;
};

export type NightDigest = {
  rows: DigestRow[]; // sorted by job
  badLines: number; // non-empty lines that did not parse into a valid entry
};

// Returns null when runs/<night>.jsonl does not exist (routes answer 404).
export type ReadNight = (runsDir: string, night: string) => NightDigest | null;
