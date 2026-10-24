import type { DataCenterProject } from "@/lib/schemas";

/**
 * Massachusetts regulatory rule engine.
 *
 * Integrity constraints (see .kiro/steering/massachusetts-policy.md):
 *  - The EO 658 threshold is "greater than 25 MW". A project at EXACTLY 25 MW
 *    does NOT automatically exceed it. 30 MW does (subject to scope/facts).
 *  - Expansions use a separate applicability note reflecting the order's language.
 *  - Pending implementation guidance is labeled "under development", never final.
 *  - The Qualified Data Center tax exemption is SEPARATE from the EO 658 threshold.
 */

export type ApplicabilityStatus =
  | "potentially-applicable"
  | "not-triggered"
  | "more-info-required"
  | "guidance-under-development";

export const STATUS_LABELS: Record<ApplicabilityStatus, string> = {
  "potentially-applicable": "Potentially applicable",
  "not-triggered": "Not triggered by current scenario",
  "more-info-required": "More information required",
  "guidance-under-development": "Policy guidance under development",
};

export interface PolicyFinding {
  ruleId: string;
  title: string;
  sourceId: string; // references DATA_SOURCES
  status: ApplicabilityStatus;
  /** Which project inputs drove the flag. */
  basis: string;
  /** What info is still needed to determine applicability. */
  missingInfo: string[];
  agency: string;
  explanation: string;
}

export const EO658_THRESHOLD_MW = 25;

/** True only when peak demand is strictly greater than 25 MW. */
export function exceedsEo658Threshold(peakMW: number): boolean {
  return peakMW > EO658_THRESHOLD_MW;
}

export interface PolicyEvaluation {
  thresholdExceeded: boolean;
  peakMW: number;
  findings: PolicyFinding[];
  summary: string;
}

export function evaluatePolicy(project: DataCenterProject): PolicyEvaluation {
  const peakMW = project.peakFacilityMW;
  const exceeds = exceedsEo658Threshold(peakMW);
  const findings: PolicyFinding[] = [];

  // Core scope / threshold finding.
  if (exceeds) {
    findings.push({
      ruleId: "eo658-scope",
      title: "EO 658 large-project scope (peak demand > 25 MW)",
      sourceId: "eo-658",
      status: "potentially-applicable",
      basis: `Peak facility demand of ${peakMW} MW is greater than the 25 MW threshold referenced by the order.`,
      missingInfo: [
        "Final interconnection / point-of-delivery configuration",
        "Whether site-specific exemptions apply",
      ],
      agency: "Executive Office / Department of Public Utilities (as applicable)",
      explanation:
        "The order addresses large data center projects exceeding 25 MW of peak demand. This scenario is above that threshold, so the order's requirements are potentially applicable subject to the order's full scope and other facts.",
    });
  } else if (peakMW === EO658_THRESHOLD_MW) {
    findings.push({
      ruleId: "eo658-scope",
      title: "EO 658 large-project scope (peak demand at 25 MW)",
      sourceId: "eo-658",
      status: "more-info-required",
      basis: `Peak facility demand equals 25 MW, which is NOT greater than the 25 MW threshold.`,
      missingInfo: [
        "Confirmation that peak demand does not exceed 25 MW under final design",
        "Aggregation rules for co-located or phased capacity",
      ],
      agency: "Executive Office / Department of Public Utilities (as applicable)",
      explanation:
        "A project at exactly 25 MW does not automatically fall within the order's 'greater than 25 MW' scope. Applicability depends on final peak demand and any aggregation rules.",
    });
  } else {
    findings.push({
      ruleId: "eo658-scope",
      title: "EO 658 large-project scope (peak demand < 25 MW)",
      sourceId: "eo-658",
      status: "not-triggered",
      basis: `Peak facility demand of ${peakMW} MW is below the 25 MW threshold.`,
      missingInfo: ["Whether future phases would raise peak demand above 25 MW"],
      agency: "Executive Office / Department of Public Utilities (as applicable)",
      explanation:
        "Based on the modeled peak demand, the order's large-project scope is not triggered by the current scenario. Later expansion could change this.",
    });
  }

  // Expansion-specific applicability (separate check).
  if (project.isExpansion) {
    findings.push({
      ruleId: "eo658-expansion",
      title: "EO 658 applicability to expansions",
      sourceId: "eo-658",
      status: "more-info-required",
      basis: "Project is flagged as an expansion of existing capacity.",
      missingInfo: [
        "Baseline existing capacity and the size of the increment",
        "Whether the expansion independently or cumulatively meets the order's scope",
      ],
      agency: "Executive Office / Department of Public Utilities (as applicable)",
      explanation:
        "The order also addresses expansions. Applicability to an expansion is evaluated under the order's specific language and may differ from a new standalone project.",
    });
  }

  // University exemption pathway.
  if (project.projectType === "university-research") {
    findings.push({
      ruleId: "eo658-university-exemption",
      title: "Possible university-related exemption pathway",
      sourceId: "eo-658",
      status: "more-info-required",
      basis: "Project type is a university research compute facility.",
      missingInfo: [
        "Whether the facility qualifies and is approved under the stated exemption process",
      ],
      agency: "Executive Office (exemption approval process)",
      explanation:
        "The order allows specific exemptions, including certain university-related facilities when approved under the stated process. Exemption is not automatic.",
    });
  }

  // Thematic requirements — only surfaced as potentially applicable when in scope.
  const inScope = exceeds;
  const themedStatus: ApplicabilityStatus = inScope
    ? "potentially-applicable"
    : "not-triggered";

  const themes: Array<Omit<PolicyFinding, "status">> = [
    {
      ruleId: "eo658-cba",
      title: "Community benefits agreement expectations",
      sourceId: "eo-658",
      basis: inScope
        ? "Large projects within scope are expected to address community benefits."
        : "Below scope threshold under current scenario.",
      missingInfo: ["Host community engagement status", "Draft CBA terms"],
      agency: "Host municipality / Executive Office",
      explanation:
        "The order addresses community benefits agreements for large data center projects.",
    },
    {
      ruleId: "eo658-clean-electricity",
      title: "Clean-electricity procurement expectations",
      sourceId: "eo-658",
      basis: inScope
        ? `Modeled clean-energy coverage is ${(project.cleanEnergyCoverage * 100).toFixed(0)}% (assumption).`
        : "Below scope threshold under current scenario.",
      missingInfo: [
        "Documented, incremental procurement (RECs alone may not satisfy incremental-generation expectations)",
        "Regulatory verification of qualifying supply",
      ],
      agency: "Department of Energy Resources / DPU",
      explanation:
        "The order addresses clean-electricity procurement. Assumed coverage is a scenario input and is not the same as documented, verified, incremental procurement.",
    },
    {
      ruleId: "eo658-water",
      title: "Water quantity and quality requirements",
      sourceId: "eo-658",
      basis: inScope
        ? "Cooling and water-use assumptions may implicate water requirements."
        : "Below scope threshold under current scenario.",
      missingInfo: ["Actual water source and withdrawal data", "Discharge permitting status"],
      agency: "MassDEP",
      explanation:
        "The order addresses water quantity and quality. Modeled water use is an estimate, not measured facility data.",
    },
    {
      ruleId: "eo658-ratepayer",
      title: "Ratepayer protection and infrastructure cost allocation",
      sourceId: "eo-658",
      basis: inScope
        ? `Developer-funded fraction is ${(project.developerFundedFraction * 100).toFixed(0)}% (assumption).`
        : "Below scope threshold under current scenario.",
      missingInfo: ["Approved cost-allocation methodology", "Utility interconnection study"],
      agency: "Department of Public Utilities",
      explanation:
        "The order addresses ratepayer protection and how infrastructure upgrade costs are allocated.",
    },
    {
      ruleId: "eo658-reporting",
      title: "Reporting and disclosure expectations",
      sourceId: "eo-658",
      basis: inScope ? "In-scope projects face reporting/disclosure expectations." : "Below scope threshold under current scenario.",
      missingInfo: ["Specific reporting templates (implementation guidance pending)"],
      agency: "Executive Office / DPU",
      explanation:
        "The order addresses reporting and disclosure. Some implementation details are still under development as of October 2026.",
    },
  ];

  for (const t of themes) {
    findings.push({ ...t, status: themedStatus });
  }

  // Implementation-guidance caveat (always shown, never as final rule).
  findings.push({
    ruleId: "eo658-implementation-pending",
    title: "Implementation rules and guidance",
    sourceId: "eo-658",
    status: "guidance-under-development",
    basis: "Some EO 658 implementation rules/guidance are scheduled for future development.",
    missingInfo: ["Final regulations and agency guidance documents"],
    agency: "Commonwealth of Massachusetts",
    explanation:
      "As of October 2026, certain implementation measures required by the order are still being developed. Pending measures are not finalized regulation.",
  });

  const summary = exceeds
    ? `At ${peakMW} MW peak demand, the scenario is above EO 658's >25 MW threshold; several requirements are potentially applicable subject to scope and further facts.`
    : peakMW === EO658_THRESHOLD_MW
      ? `At exactly 25 MW, the scenario is not automatically within EO 658's >25 MW scope; more information is required.`
      : `At ${peakMW} MW peak demand, the scenario is below EO 658's >25 MW threshold under the current assumptions.`;

  return { thresholdExceeded: exceeds, peakMW, findings, summary };
}

/**
 * Qualified Data Center Sales & Use Tax Exemption — informational and SEPARATE
 * from the EO 658 MW threshold. We do not merge the two frameworks.
 */
export interface TaxExemptionInfo {
  title: string;
  sourceId: string;
  status: ApplicabilityStatus;
  explanation: string;
}

export function taxExemptionInfo(): TaxExemptionInfo {
  return {
    title: "Massachusetts Qualified Data Center Sales and Use Tax Exemption",
    sourceId: "qdc-tax-exemption",
    status: "more-info-required",
    explanation:
      "A separate tax-incentive framework with its own eligibility criteria (e.g., qualification and certification requirements). Eligibility is independent of EO 658's peak-demand threshold and is determined by the Commonwealth. Review the official source for current application status and criteria.",
  };
}
