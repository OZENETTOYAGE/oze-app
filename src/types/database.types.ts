export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type UserRole = "admin" | "manager" | "administratif" | "agent";
export type DevisStatut = "brouillon" | "envoyé" | "accepté" | "refusé" | "expiré" | "converti";
export type FactureStatut = "brouillon" | "émise" | "envoyée" | "partiellement_payée" | "payée" | "en_retard" | "relancée" | "litige" | "annulée";
export type ChantierStatut = "planifié" | "en_cours" | "terminé" | "suspendu" | "litige";
export type InterventionStatut = "brouillon" | "en_cours" | "en_attente" | "terminée" | "validée" | "litige";
export type PointageStatut = "en_cours" | "terminé" | "validé" | "litige";
export type AssignmentRole = "agent" | "chef_equipe" | "remplacant";
export type PaiementMode = "virement" | "chèque" | "espèces" | "carte" | "prélèvement" | "autre";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string; email: string; nom: string; prenom: string; role: UserRole;
          avatar_url: string | null; tel: string | null; poste: string | null;
          actif: boolean; taux_horaire: number | null; created_at: string; updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["profiles"]["Row"], "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
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
      };
      chantiers: {
        Row: {
          id: string; reference: string; client_id: string; manager_id: string | null;
          nom: string; type: string; statut: ChantierStatut; adresse: string | null;
          ville: string | null; prix_ht: number | null; taux_tva: number;
          frequence: string; date_debut: string | null; date_fin: string | null;
          budget_heures: number | null; notes: string | null;
          created_by: string | null; created_at: string; updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["chantiers"]["Row"], "id" | "reference" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["chantiers"]["Insert"]>;
      };
      pointages: {
        Row: {
          id: string; user_id: string; chantier_id: string | null;
          heure_debut: string; heure_fin: string | null; duree_minutes: number | null;
          type: string; statut: PointageStatut; taux_horaire: number | null;
          cout_mo: number | null; note: string | null; anomalie: boolean;
          valide_par: string | null; valide_at: string | null;
          created_at: string; updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["pointages"]["Row"], "id" | "duree_minutes" | "cout_mo" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["pointages"]["Insert"]>;
      };
      interventions: {
        Row: {
          id: string; chantier_id: string; user_id: string; statut: InterventionStatut;
          date_prevue: string; started_at: string | null; finished_at: string | null;
          commentaires: string | null; commentaire_fin: string | null;
          signature_url: string | null; signature_nom: string | null;
          client_note: number | null; created_at: string; updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["interventions"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["interventions"]["Insert"]>;
      };
      devis: {
        Row: {
          id: string; numero: string; client_id: string; chantier_id: string | null;
          statut: DevisStatut; objet: string; date_emission: string; date_validite: string | null;
          total_ht: number; total_tva: number; total_ttc: number;
          converti_en_facture_id: string | null; created_by: string | null;
          created_at: string; updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["devis"]["Row"], "id" | "numero" | "total_ht" | "total_tva" | "total_ttc" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["devis"]["Insert"]>;
      };
      factures: {
        Row: {
          id: string; numero: string; devis_id: string | null; client_id: string;
          statut: FactureStatut; objet: string; date_emission: string; date_echeance: string | null;
          total_ht: number; total_tva: number; total_ttc: number; montant_paye: number; solde: number;
          iban: string | null; bic: string | null; created_by: string | null;
          created_at: string; updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["factures"]["Row"], "id" | "numero" | "total_ht" | "total_tva" | "total_ttc" | "solde" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["factures"]["Insert"]>;
      };
    };
    Views: Record<string, never>;
    Enums: {
      user_role: UserRole;
      chantier_statut: ChantierStatut;
      pointage_statut: PointageStatut;
    };
  };
}
