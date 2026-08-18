/**
 * Smart Waste Classification Engine
 * Analyzes waste characteristics/keywords with deterministic fallback architecture.
 * Designed for easy plug-and-play integration with computer vision models (e.g. TensorFlow.js or Cloud AI).
 */

const CATEGORIES = [
  "Plastic",
  "Organic",
  "Paper",
  "Cardboard",
  "Metal",
  "Glass",
  "E-Waste",
  "Hazardous",
  "Mixed"
];

function getConfidenceLevel(score) {
  if (score >= 0.90) return "High";
  if (score >= 0.70) return "Medium";
  return "Low";
}

function classifyWaste(filename = "", fileMeta = {}) {
  const name = (filename || "").toLowerCase();

  let predictedCategory = "Mixed";
  let confidence = 0.65; // Base low confidence for unknown files

  if (name.includes("bottle") || name.includes("plastic") || name.includes("bag") || name.includes("pet") || name.includes("wrapper") || name.includes("polythene")) {
    predictedCategory = "Plastic";
    confidence = 0.94;
  } else if (name.includes("apple") || name.includes("banana") || name.includes("food") || name.includes("leaf") || name.includes("plant") || name.includes("veg") || name.includes("peel") || name.includes("organic") || name.includes("compost")) {
    predictedCategory = "Organic";
    confidence = 0.92;
  } else if (name.includes("phone") || name.includes("battery") || name.includes("cable") || name.includes("wire") || name.includes("electronic") || name.includes("laptop") || name.includes("circuit") || name.includes("charger")) {
    predictedCategory = "E-Waste";
    confidence = 0.95;
  } else if (name.includes("can") || name.includes("metal") || name.includes("tin") || name.includes("aluminum") || name.includes("steel") || name.includes("copper")) {
    predictedCategory = "Metal";
    confidence = 0.91;
  } else if (name.includes("paper") || name.includes("newspaper") || name.includes("magazine") || name.includes("document")) {
    predictedCategory = "Paper";
    confidence = 0.88;
  } else if (name.includes("cardboard") || name.includes("carton") || name.includes("box") || name.includes("packaging")) {
    predictedCategory = "Cardboard";
    confidence = 0.89;
  } else if (name.includes("glass") || name.includes("jar") || name.includes("mirror") || name.includes("window")) {
    predictedCategory = "Glass";
    confidence = 0.90;
  } else if (name.includes("chemical") || name.includes("paint") || name.includes("oil") || name.includes("medical") || name.includes("hazardous")) {
    predictedCategory = "Hazardous";
    confidence = 0.93;
  } else if (name.includes("trash") || name.includes("rubbish") || name.includes("dump") || name.includes("debris") || name.includes("waste")) {
    predictedCategory = "Mixed";
    confidence = 0.78;
  }

  const confidenceLevel = getConfidenceLevel(confidence);

  let recommendation = "";
  if (confidenceLevel === "High") {
    recommendation = `AI Classification: ${predictedCategory} (${Math.round(confidence * 100)}% confidence)`;
  } else if (confidenceLevel === "Medium") {
    recommendation = `AI Suggests: ${predictedCategory} (${Math.round(confidence * 100)}% confidence). Please verify below.`;
  } else {
    recommendation = `Unable to confidently classify image. Please select the correct category manually.`;
  }

  return {
    category: predictedCategory,
    confidence,
    confidenceLevel,
    recommendation,
    isMock: true
  };
}

module.exports = {
  classifyWaste,
  CATEGORIES
};
