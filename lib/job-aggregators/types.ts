export type AggregatorSource = "remoteok" | "remotive" | "jobicy" | "adzuna";

/** Normalized row ready for upsert into aggregated_jobs */
export type CollectedJob = {
  source: AggregatorSource;
  external_id: string;
  title: string;
  company_name: string;
  location: string | null;
  employment_type: "full_time" | "part_time" | "contract" | "internship" | "attachment";
  salary_text: string | null;
  summary: string | null;
  description: string;
  apply_url: string;
  company_logo_url: string | null;
  industry: string | null;
  seniority: string | null;
  posted_at: string | null;
};

export type CollectorResult = {
  source: AggregatorSource;
  jobs: CollectedJob[];
  error: string | null;
};
