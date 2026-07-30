// Shared URL cleaning logic for PK Chrome Shortcuts.
// Loaded by background.js (importScripts) and options.html (<script src>).

const TRACKING_PARAM_SOURCES = {
  utm: {
    label: "UTM (Google Analytics)",
    params: [
      "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content",
      "utm_id", "utm_referrer", "utm_social", "utm_name", "utm_brand",
      "utm_creative_format", "utm_marketing_tactic", "utm_explicit",
      "utm_variant", "utm_creative", "utm_placement", "utm_device", "utm_location"
    ]
  },
  facebook: {
    label: "Facebook",
    params: ["fbclid", "mkt_tok", "hmb_campaign", "hmb_medium", "hmb_source"]
  },
  googleads: {
    label: "Google Ads",
    params: ["gclid", "dclid", "gbraid", "wbraid", "gclsrc"]
  },
  linkedin: {
    label: "LinkedIn",
    params: ["trk", "trkInfo", "refId", "trackingId", "lipi", "lipId", "origin", "midToken", "upsellOrderTrackingId"]
  },
  microsoft: {
    label: "Microsoft Ads",
    params: ["msclkid"]
  },
  mailchimp: {
    label: "Mailchimp",
    params: ["mc_eid", "mc_cid"]
  },
  instagram: {
    label: "Instagram",
    params: ["igshid"]
  },
  youtube: {
    label: "YouTube",
    params: ["si", "feature", "gclid_branch", "app"]
  },
  hubspot: {
    label: "HubSpot",
    params: ["_hsenc", "_hsmi", "_hsfp", "hsCtaTracking", "__hssc", "__hstc", "__hsfp"]
  },
  yandex: {
    label: "Yandex",
    params: ["yclid", "yadclid", "yadordid"]
  },
  aliexpress: {
    label: "AliExpress / Alibaba",
    params: ["spm", "scm"]
  },
  tiktok: {
    label: "TikTok",
    params: ["ttclid", "u_code", "share_source", "user_id"]
  },
  twitter: {
    label: "Twitter / X",
    params: ["twclid", "ref_src", "ref_url", "s", "t"]
  },
  generic: {
    label: "Generic tracking",
    params: [
      "ref", "referrer", "source", "src", "campaign_id", "ad_id", "adgroup_id",
      "share", "share_id", "vero_id", "vero_conv", "pk_campaign", "pk_kwd",
      "sc_campaign", "sc_channel", "sc_content", "sc_medium", "sc_outcome",
      "sc_geo", "sc_country", "Echogram", "_branch_match_id",
      "oly_enc_id", "oly_anon_id", "s_cid", "wickedid", "campaign", "cmpid", "mbid"
    ]
  }
};

const LIGHT_MODE_PARAMS = [
  // UTM
  "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "utm_id",
  // Facebook
  "fbclid",
  // Google Ads
  "gclid", "dclid",
  // LinkedIn
  "trk", "refId", "trackingId",
  // Instagram
  "igshid",
  // YouTube
  "si",
  // Twitter / X
  "twclid",
  // TikTok
  "ttclid",
  // Microsoft
  "msclkid",
  // Yandex
  "yclid",
  // HubSpot
  "_hsenc", "_hsmi",
  // Mailchimp
  "mc_eid", "mc_cid",
  // Generic
  "mkt_tok", "_branch_match_id"
];

const TRACKING_HASHES = new Set(["#", "#=_", "#_=_", "#!"]);

const URLCleaner = {
  sources: TRACKING_PARAM_SOURCES,

  getParamsToRemove(config) {
    const mode = (config && config.mode) || "balanced";

    if (mode === "strict") return "all";
    if (mode === "light") return LIGHT_MODE_PARAMS.slice();

    const allParams = Object.values(TRACKING_PARAM_SOURCES).flatMap((s) => s.params);
    if (mode === "balanced") return allParams;

    // custom mode
    const selected = new Set();
    (config.customSources || []).forEach((srcId) => {
      const src = TRACKING_PARAM_SOURCES[srcId];
      if (src) src.params.forEach((p) => selected.add(p));
    });
    const customStr = (config.customParams || "").trim();
    if (customStr) {
      customStr
        .split(/[,\s\n]+/)
        .map((s) => s.trim())
        .filter(Boolean)
        .forEach((p) => selected.add(p));
    }
    return Array.from(selected);
  },

  clean(url, config) {
    if (typeof url !== "string" || !url) return url;

    try {
      const u = new URL(url);
      const paramsToRemove = this.getParamsToRemove(config);

      if (paramsToRemove === "all") {
        u.search = "";
        u.hash = "";
        return u.toString();
      }

      paramsToRemove.forEach((p) => u.searchParams.delete(p));

      if (TRACKING_HASHES.has(u.hash)) {
        u.hash = "";
      }

      return u.toString();
    } catch {
      return url;
    }
  },

  normalizeForDedup(url) {
    if (typeof url !== "string" || !url) return url;

    try {
      const u = new URL(url);
      u.hash = "";
      u.hostname = (u.hostname || "").toLowerCase();

      const allParams = Object.values(TRACKING_PARAM_SOURCES).flatMap((s) => s.params);
      allParams.forEach((p) => u.searchParams.delete(p));

      let result = u.toString();
      if (result.endsWith("/") && u.pathname && u.pathname.length > 1) {
        result = result.slice(0, -1);
      }
      return result;
    } catch {
      return (url || "").toLowerCase().trim();
    }
  }
};

if (typeof globalThis !== "undefined") {
  globalThis.URLCleaner = URLCleaner;
  globalThis.TRACKING_PARAM_SOURCES = TRACKING_PARAM_SOURCES;
}
