export function getPredictions(response) {
  const predictions = response?.predictions
  if (Array.isArray(predictions)) return predictions
  if (predictions && typeof predictions === 'object') return [predictions]
  if (response && typeof response === 'object') return [response]
  return []
}

export function getFeatureExplanations(prediction) {
  if (Array.isArray(prediction?.feature_explanations)) return prediction.feature_explanations
  return Object.entries(prediction?.shap_values || {}).map(([feature_name, shap_value]) => ({
    feature_name,
    feature_value: null,
    shap_value,
  }))
}

export function getFeatureExplanationsFromResponse(response) {
  if (Array.isArray(response)) return response
  const prediction = getPredictions(response)[0]
  return prediction ? getFeatureExplanations(prediction) : []
}

export function simulationKey(simulationType, id) {
  return `${simulationType}:${id}`
}