import json
import math
from dataclasses import dataclass, field


def _finite_number(value, name: str) -> float:
    message = f"{name} deve essere un numero finito (tipo ricevuto: {type(value).__name__})"
    if isinstance(value, bool) or not isinstance(value, (int, float, str)):
        raise ValueError(message)
    try:
        number = float(value)
    except (ValueError, OverflowError) as exc:
        raise ValueError(message) from exc
    if not math.isfinite(number):
        raise ValueError(message)
    return number


def _feature_text(value, name: str) -> str | None:
    if value is None or isinstance(value, str):
        return value
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        _finite_number(value, name)
        return str(value)
    raise ValueError(f"{name} deve essere una stringa (tipo ricevuto: {type(value).__name__})")


@dataclass
class FeatureExplanation:
    feature_name: str
    feature_value: str | None
    shap_value: float

    @classmethod
    def from_dict(cls, data: dict) -> "FeatureExplanation":
        if not isinstance(data, dict) or not isinstance(data.get("feature_name"), str) or not data["feature_name"].strip():
            raise ValueError("feature_name deve essere una stringa non vuota")
        return cls(
            feature_name=data["feature_name"],
            feature_value=_feature_text(data.get("feature_value"), f"feature_value della feature {data['feature_name']!r}"),
            shap_value=_finite_number(data.get("shap_value"), f"shap_value della feature {data['feature_name']!r}"),
        )
    
    @classmethod
    def payload_from_storage_map(cls, feature_map) -> list[dict]:
        source = json.loads(feature_map) if isinstance(feature_map, str) else feature_map
        if source is None:
            source = {}
        if not isinstance(source, dict):
            raise ValueError("feature_explanations deve essere un MAP")
        features = [cls.from_dict({"feature_name": name, **values}) for name, values in source.items()]
        return [
            {
                "feature_name": feature.feature_name,
                "feature_value": feature.feature_value,
                "shap_value": feature.shap_value,
            }
            for feature in features
        ]


@dataclass
class Prediction:
    predicted_share_pct: float | None
    feature_explanations: list[FeatureExplanation] = field(default_factory=list)

    @classmethod
    def from_dict(cls, data: dict) -> "Prediction":
        if not isinstance(data, dict):
            raise ValueError("predictions deve essere un oggetto JSON; gli array non sono ancora supportati")
        features = data.get("feature_explanations", [])
        if not isinstance(features, list):
            raise ValueError("feature_explanations deve essere un array")
        explanations = [FeatureExplanation.from_dict(feature) for feature in features]
        names = [feature.feature_name for feature in explanations]
        if len(set(names)) != len(names):
            raise ValueError("feature_explanations contiene nomi duplicati")
        return cls(
            predicted_share_pct=_finite_number(data.get("predicted_share_pct"), "predicted_share_pct"),
            feature_explanations=explanations,
        )

    def to_feature_map(self) -> dict:
        return {
            feature.feature_name: {"feature_value": feature.feature_value, "shap_value": feature.shap_value}
            for feature in self.feature_explanations
        }
