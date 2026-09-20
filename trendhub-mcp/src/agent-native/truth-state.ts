/**
 * TrendHub Truth State Contract v1.
 * Missing observations never silently become zero, absence, or health.
 */
export type EvidenceTruthState =
  | "AVAILABLE" | "NOT_COLLECTED" | "UNAVAILABLE" | "STALE" | "OFFLINE"
  | "AUTH_REQUIRED" | "RATE_LIMITED" | "BLOCKED" | "ERROR" | "PENDING"
  | "SCHEDULED" | "UNKNOWN";
export type TopicPresence = "PRESENT" | "ABSENT" | "UNDETERMINED";
export interface EvidenceTruthAssessment { source:string; state:EvidenceTruthState; presence:TopicPresence; observed:boolean; reason:string; }
export interface TruthTrajectoryInput {
  platform:string; historySamples:number; observableNow:boolean; current:boolean;
  sourceStatus:"UP"|"DEGRADED"|"DOWN"|"AUTH_REQUIRED"|"RATE_LIMITED"|"UNKNOWN";
  latestEvidenceAt:string|null; latestEvidenceAgeHours:number|null;
}
export function truthStateFromTrajectory(input:TruthTrajectoryInput):EvidenceTruthAssessment {
  if(input.observableNow) return {source:input.platform,state:"AVAILABLE",presence:input.current?"PRESENT":"ABSENT",observed:true,reason:input.current?"Fresh usable evidence contains the topic.":"Fresh usable evidence was observed and does not contain the topic."};
  if(input.sourceStatus==="AUTH_REQUIRED") return {source:input.platform,state:"AUTH_REQUIRED",presence:"UNDETERMINED",observed:false,reason:"The source requires user-authorized access; topic absence cannot be inferred."};
  if(input.sourceStatus==="RATE_LIMITED") return {source:input.platform,state:"RATE_LIMITED",presence:"UNDETERMINED",observed:false,reason:"The source is rate-limited; topic absence cannot be inferred."};
  if(input.historySamples===0||input.latestEvidenceAt===null) return {source:input.platform,state:"NOT_COLLECTED",presence:"UNDETERMINED",observed:false,reason:"No usable local observation exists for this source yet."};
  if(input.latestEvidenceAgeHours!=null&&input.latestEvidenceAgeHours>12) return {source:input.platform,state:"STALE",presence:"UNDETERMINED",observed:false,reason:"The latest local evidence is older than the current-evidence freshness boundary."};
  if(input.sourceStatus==="DOWN") return {source:input.platform,state:"OFFLINE",presence:"UNDETERMINED",observed:false,reason:"The latest source observation is down; topic absence cannot be inferred."};
  if(input.sourceStatus==="UNKNOWN") return {source:input.platform,state:"UNKNOWN",presence:"UNDETERMINED",observed:false,reason:"Current source observability is unknown."};
  return {source:input.platform,state:"UNAVAILABLE",presence:"UNDETERMINED",observed:false,reason:"Current evidence is not usable enough to support presence or absence."};
}
export function summarizeTruthState(items:EvidenceTruthAssessment[]):EvidenceTruthState {
  if(!items.length)return "NOT_COLLECTED";
  if(items.some(x=>x.state==="AVAILABLE"))return "AVAILABLE";
  if(items.every(x=>x.state==="NOT_COLLECTED"))return "NOT_COLLECTED";
  if(items.every(x=>x.state==="STALE"||x.state==="NOT_COLLECTED"))return "STALE";
  if(items.some(x=>x.state==="AUTH_REQUIRED"))return "AUTH_REQUIRED";
  if(items.some(x=>x.state==="RATE_LIMITED"))return "RATE_LIMITED";
  if(items.some(x=>x.state==="OFFLINE"))return "OFFLINE";
  return "UNAVAILABLE";
}
