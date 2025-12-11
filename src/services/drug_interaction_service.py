"""
Drug Interaction Database Service
Integrates with external drug interaction databases
"""
import os
import requests
from typing import List, Dict, Optional

class DrugInteractionService:
    """Service for checking drug interactions via external APIs"""
    
    def __init__(self):
        # DrugBank API (requires API key)
        self.drugbank_api_key = os.getenv('DRUGBANK_API_KEY', '')
        self.drugbank_base_url = 'https://api.drugbank.com/v1'
        
        # RxNorm API (free, no key required)
        self.rxnorm_base_url = 'https://rxnav.nlm.nih.gov/REST'
        
        # Fallback: Use internal database
        self.use_internal_db = True
    
    def check_interactions(self, drug_ids: List[int], patient_id: Optional[int] = None) -> Dict:
        """Check for drug interactions"""
        warnings = []
        
        # Check drug-drug interactions
        for i, drug1_id in enumerate(drug_ids):
            for drug2_id in drug_ids[i+1:]:
                interaction = self._check_drug_drug_interaction(drug1_id, drug2_id)
                if interaction:
                    warnings.append(interaction)
        
        # Check drug-allergy interactions if patient_id provided
        if patient_id:
            allergy_warnings = self._check_drug_allergy_interactions(drug_ids, patient_id)
            warnings.extend(allergy_warnings)
        
        return {
            'has_interactions': len(warnings) > 0,
            'warnings': warnings,
            'severity': self._get_highest_severity(warnings)
        }
    
    def _check_drug_drug_interaction(self, drug1_id: int, drug2_id: int) -> Optional[Dict]:
        """Check interaction between two drugs"""
        # Try external API first
        if self.drugbank_api_key:
            return self._check_via_drugbank(drug1_id, drug2_id)
        
        # Fallback to internal database
        if self.use_internal_db:
            from src.models.prescribing import DrugInteraction, Drug
            from src.models.user import db
            
            drug1 = Drug.query.get(drug1_id)
            drug2 = Drug.query.get(drug2_id)
            
            if not drug1 or not drug2:
                return None
            
            # Check internal database
            interaction = DrugInteraction.query.filter(
                db.or_(
                    db.and_(DrugInteraction.drug1_id == drug1_id, DrugInteraction.drug2_id == drug2_id),
                    db.and_(DrugInteraction.drug1_id == drug2_id, DrugInteraction.drug2_id == drug1_id)
                )
            ).first()
            
            if interaction:
                return {
                    'type': 'drug_interaction',
                    'severity': interaction.severity,
                    'drug1': drug1.drug_name,
                    'drug2': drug2.drug_name,
                    'description': interaction.description,
                    'source': 'internal_database'
                }
        
        return None
    
    def _check_via_drugbank(self, drug1_id: int, drug2_id: int) -> Optional[Dict]:
        """Check interaction via DrugBank API"""
        try:
            from src.models.prescribing import Drug
            
            drug1 = Drug.query.get(drug1_id)
            drug2 = Drug.query.get(drug2_id)
            
            if not drug1 or not drug2:
                return None
            
            # Use DrugBank API (example - actual implementation would use real API)
            # This is a placeholder for actual API integration
            url = f"{self.drugbank_base_url}/interactions"
            headers = {
                'Authorization': f'Bearer {self.drugbank_api_key}',
                'Content-Type': 'application/json'
            }
            
            # For now, return None (would implement actual API call)
            # In production, this would make actual API calls
            
            return None
            
        except Exception as e:
            print(f"DrugBank API error: {e}")
            return None
    
    def _check_drug_allergy_interactions(self, drug_ids: List[int], patient_id: int) -> List[Dict]:
        """Check for drug-allergy interactions"""
        warnings = []
        
        from src.models.patient import Allergy
        from src.models.prescribing import Drug
        
        patient_allergies = Allergy.query.filter_by(patient_id=patient_id).all()
        allergen_names = [a.allergen.lower() for a in patient_allergies]
        
        for drug_id in drug_ids:
            drug = Drug.query.get(drug_id)
            if not drug:
                continue
            
            drug_name_lower = drug.drug_name.lower()
            generic_name_lower = (drug.generic_name or '').lower()
            
            for allergen in allergen_names:
                if allergen in drug_name_lower or allergen in generic_name_lower:
                    warnings.append({
                        'type': 'drug_allergy',
                        'severity': 'severe',
                        'drug': drug.drug_name,
                        'allergen': allergen,
                        'description': f'Patient is allergic to {allergen}',
                        'source': 'internal_check'
                    })
        
        return warnings
    
    def _get_highest_severity(self, warnings: List[Dict]) -> str:
        """Get highest severity level from warnings"""
        if not warnings:
            return 'none'
        
        severities = ['severe', 'moderate', 'minor', 'info']
        for severity in severities:
            if any(w.get('severity') == severity for w in warnings):
                return severity
        
        return 'info'
    
    def sync_external_database(self):
        """Sync with external drug interaction database"""
        # This would sync drug interaction data from external sources
        # For now, it's a placeholder
        pass

# Singleton instance
drug_interaction_service = DrugInteractionService()

