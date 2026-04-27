"""
Shared prescription safety checks (drug–drug, drug–allergy) for all Rx entry points.
"""
from __future__ import annotations

import json
from typing import Any, Dict, List, Optional

from src.models.user import db
from src.models.prescribing import Drug, DrugInteraction, Prescription
from src.models.patient import Allergy
from src.services.drug_interaction_service import drug_interaction_service


def _blocking_severity(w: Dict[str, Any]) -> bool:
    sev = (w.get('severity') or '').lower()
    itype = (w.get('interaction_type') or '').lower()
    if sev in ('severe', 'critical', 'contraindicated'):
        return True
    if itype == 'contraindicated':
        return True
    return False


def collect_prescription_warnings(patient_id: int, drug_id: int) -> List[Dict[str, Any]]:
    """Gather warnings for adding drug_id to patient's active regimen."""
    warnings: List[Dict[str, Any]] = []

    active_prescriptions = Prescription.query.filter(
        Prescription.patient_id == patient_id,
        Prescription.status == 'active',
    ).all()
    active_drug_ids = [p.drug_id for p in active_prescriptions if p.drug_id]

    all_drug_ids = active_drug_ids + [drug_id]
    interaction_check = drug_interaction_service.check_interactions(all_drug_ids, patient_id)
    for w in interaction_check.get('warnings', []):
        if isinstance(w, dict):
            warnings.append(dict(w))

    for active_drug_id in active_drug_ids:
        if active_drug_id == drug_id:
            continue
        interaction = DrugInteraction.query.filter(
            db.or_(
                db.and_(DrugInteraction.drug1_id == drug_id, DrugInteraction.drug2_id == active_drug_id),
                db.and_(DrugInteraction.drug1_id == active_drug_id, DrugInteraction.drug2_id == drug_id),
            )
        ).first()
        if interaction:
            warnings.append({
                'type': 'drug_interaction',
                'severity': interaction.severity,
                'interaction_type': interaction.interaction_type,
                'drug1_id': drug_id,
                'drug2_id': active_drug_id,
                'description': interaction.description,
            })

    patient_allergies = Allergy.query.filter(Allergy.patient_id == patient_id).all()
    allergen_names = [a.allergen.lower() for a in patient_allergies if a.allergen]

    drug = Drug.query.get(drug_id)
    if drug:
        drug_name_lower = drug.drug_name.lower()
        generic_name_lower = (drug.generic_name or '').lower()
        for allergen in allergen_names:
            if allergen in drug_name_lower or allergen in generic_name_lower:
                warnings.append({
                    'type': 'drug_allergy',
                    'severity': 'severe',
                    'drug_id': drug_id,
                    'allergen': allergen,
                    'description': f'Patient is allergic to {allergen}',
                })

    return warnings


def blocking_warnings(warnings: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    return [w for w in warnings if _blocking_severity(w)]


def warnings_json(warnings: List[Dict[str, Any]]) -> Optional[str]:
    if not warnings:
        return None
    return json.dumps(warnings)
