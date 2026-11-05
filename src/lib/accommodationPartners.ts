/**
 * LIEC Heav'n - Accommodation Partners Registry
 *
 * Centralized, maintainable configuration for authorized accommodation partners.
 * Used exclusively for student housing reservation requests.
 *
 * Configured partners:
 *  1. SCI DANOVA (adv@danova.fr)
 *  2. CITY PROPERTY (centerofexcellences23@gmail.com)
 */

export interface AccommodationPartner {
  id: 'danova' | 'city_property';
  name: string;
  email: string;
  contactName: string;
  badge: string;
  description: string;
  phone?: string;
  address?: string;
}

export const ACCOMMODATION_PARTNERS: readonly AccommodationPartner[] = [
  {
    id: 'danova',
    name: 'SCI DANOVA',
    email: 'adv@danova.fr',
    contactName: 'Équipe Réservations SCI DANOVA',
    badge: 'Résidences & Logements',
    description: 'Partenaire conventionné pour logements et résidences étudiantes à Lyon.',
    address: 'Lyon, France',
  },
  {
    id: 'city_property',
    name: 'CITY PROPERTY',
    email: 'centerofexcellences23@gmail.com',
    contactName: 'Équipe Hébergement CITY PROPERTY',
    badge: 'Immobilier & Studios',
    description: 'Partenaire immobilier pour studios et colocations étudiantes à Lyon.',
    address: 'Lyon, France',
  },
] as const;

export type AccommodationPartnerId = (typeof ACCOMMODATION_PARTNERS)[number]['id'];

/**
 * Returns partner configuration matching the given ID.
 */
export function getAccommodationPartnerById(id?: string | null): AccommodationPartner | undefined {
  if (!id) return undefined;
  return ACCOMMODATION_PARTNERS.find((p) => p.id === id);
}

/**
 * Returns partner configuration matching the given email address.
 */
export function getAccommodationPartnerByEmail(email?: string | null): AccommodationPartner | undefined {
  if (!email) return undefined;
  const clean = email.trim().toLowerCase();
  return ACCOMMODATION_PARTNERS.find((p) => p.email.toLowerCase() === clean);
}

/**
 * Validates whether an ID belongs to a known authorized accommodation partner.
 */
export function isAuthorizedPartnerId(id: string): id is AccommodationPartnerId {
  return ACCOMMODATION_PARTNERS.some((p) => p.id === id);
}
