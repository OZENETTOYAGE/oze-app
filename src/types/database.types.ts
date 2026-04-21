export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = "admin" | "manager" | "administratif" | "agent";
export type DevisStatut =
  | "brouillon" | "envoyé" | "accepté" | "refusé" | "expiré" | "converti";
export type FactureStatut =
  | "brouillon" | "émise" | "envoyée" | "partiellement_payée" | "payée"
  | "en_retard" | "relancée" | "litige" | "annulée";
export type ChantierStatut =
  | "planifié" | "en_cours" | "terminé" | "suspendu" | "litige";
export type InterventionStatut =
  | "brouillon" | "en_cours" | "en_attente" | "terminée" | "validée" | "litige";
export type PointageStatut = "en_cours" | "terminé" | "validé" | "litige";
export type AssignmentRole = "agent" | "chef_equipe" | "remplacant";
export type PaiementMode =
  | "virement" | "chèque" | "espèces" | "carte" | "prélèvement" | "autre";

export interface Database {
  __InternalSupabase: {
    PostgrestVersion: "12";
  };
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string; email: string; nom: string; prenom: string;
          role: UserRole; avatar_url: string | null; tel: string | null;
          poste: string | null; actif: boolean; taux_horaire: number | null;
          created_at: string; updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["profiles"]["Row"], "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [];
      };
      clients: {
        Row: {
          id: string; nom: string; entreprise: string | null; email: string | null;
          tel: string | null; adresse: string | null; ville: string | null;
          code_postal: string | null; notes: string | null; actif: boolean;
          created_by: string | null; created_at: string; updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["clients"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["clients"]["Insert"]>;
        Relationships: [];
      };
      chantiers: {
        Row: {
          id: string; reference: string; client_id: string; manager_id: string | null;
          nom: string; description: string | null; type: string; statut: ChantierStatut;
          adresse: string | null; ville: string | null; code_postal: string | null;
          acces_notes: string | null; surface: number | null; prix_ht: number | null;
          taux_tva: number; frequence: string; date_debut: string | null;
          date_fin: string | null; budget_heures: number | null; priorite: number;
          notes: string | null; created_by: string | null; created_at: string; updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["chantiers"]["Row"], "id" | "reference" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["chantiers"]["Insert"]>;
        Relationships: [];
      };
      pointages: {
        Row: {
          id: string; user_id: string; chantier_id: string | null;
          intervention_id: string | null; heure_debut: string; heure_fin: string | null;
          duree_minutes: number | null; type: string; statut: PointageStatut;
          taux_horaire: number | null; cout_mo: number | null; lat_debut: number | null;
          lng_debut: number | null; lat_fin: number | null; lng_fin: number | null;
          note: string | null; anomalie: boolean; valide_par: string | null;
          valide_at: string | null; created_at: string; updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["pointages"]["Row"], "id" | "duree_minutes" | "cout_mo" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["pointages"]["Insert"]>;
        Relationships: [];
      };
      interventions: {
        Row: {
          id: string; chantier_id: string; user_id: string; assignment_id: string | null;
          statut: InterventionStatut; date_prevue: string; started_at: string | null;
          finished_at: string | null; commentaires: string | null;
          commentaire_fin: string | null; anomalies: string | null;
          signature_url: string | null; signature_nom: string | null;
          photos_avant: string[]; photos_apres: string[]; client_note: number | null;
          validated_by: string | null; validated_at: string | null;
          created_at: string; updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["interventions"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["interventions"]["Insert"]>;
        Relationships: [];
      };
      devis: {
        Row: {
          id: string; numero: string; client_id: string; chantier_id: string | null;
          redacteur_id: string | null; statut: DevisStatut; objet: string;
          introduction: string | null; conditions: string | null; date_emission: string;
          date_validite: string | null; taux_tva_defaut: number; remise_pct: number;
          remise_montant: number; total_ht: number; total_tva: number; total_ttc: number;
          signe_le: string | null; signe_par: string | null;
          converti_en_facture_id: string | null; notes_internes: string | null;
          created_by: string | null; created_at: string; updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["devis"]["Row"], "id" | "numero" | "total_ht" | "total_tva" | "total_ttc" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["devis"]["Insert"]>;
        Relationships: [];
      };
      factures: {
        Row: {
          id: string; numero: string; devis_id: string | null; client_id: string;
          chantier_id: string | null; statut: FactureStatut; objet: string;
          conditions_paiement: string | null; date_emission: string;
          date_echeance: string | null; total_ht: number; total_tva: number;
          total_ttc: number; montant_paye: number; solde: number;
          taux_penalite: number; penalites: number; iban: string | null;
          bic: string | null; ref_virement: string | null; notes_internes: string | null;
          created_by: string | null; created_at: string; updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["factures"]["Row"], "id" | "numero" | "total_ht" | "total_tva" | "total_ttc" | "solde" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["factures"]["Insert"]>;
        Relationships: [];
      };
      chantier_assignments: {
        Row: {
          id: string; chantier_id: string; user_id: string; role: AssignmentRole;
          date_debut: string | null; date_fin: string | null; jours: boolean[];
          heure_debut: string | null; heure_fin: string | null; notes: string | null;
          created_by: string | null; created_at: string; updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["chantier_assignments"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["chantier_assignments"]["Insert"]>;
        Relationships: [];
      };
      intervention_checklist: {
        Row: {
          id: string; intervention_id: string; item: string; valide: boolean;
          valide_at: string | null; ordre: number; obligatoire: boolean;
          commentaire: string | null; created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["intervention_checklist"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["intervention_checklist"]["Insert"]>;
        Relationships: [];
      };
      intervention_photos: {
        Row: {
          id: string; intervention_id: string; type: string; storage_path: string;
          url: string; thumbnail_url: string | null; nom_fichier: string | null;
          taille_octets: number | null; largeur: number | null; hauteur: number | null;
          format: string | null; hash_md5: string | null; commentaire: string | null;
          ordre: number; uploaded_by: string | null; created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["intervention_photos"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["intervention_photos"]["Insert"]>;
        Relationships: [];
      };
      paiements: {
        Row: {
          id: string; facture_id: string; montant: number; mode: PaiementMode;
          date_paiement: string; reference: string | null; note: string | null;
          created_by: string | null; created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["paiements"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["paiements"]["Insert"]>;
        Relationships: [];
      };
      relances: {
        Row: {
          id: string; facture_id: string; niveau: number; envoye_le: string;
          envoye_par: string | null; canal: string; contenu: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["relances"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["relances"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: {
      user_role: UserRole;
      chantier_statut: ChantierStatut;
      intervention_statut: InterventionStatut;
      pointage_statut: PointageStatut;
      devis_statut: DevisStatut;
      facture_statut: FactureStatut;
      assignment_role: AssignmentRole;
      paiement_mode: PaiementMode;
    };
  };
}
