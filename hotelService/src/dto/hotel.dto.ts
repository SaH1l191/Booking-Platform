export type createHotelDto = {
    name: string;
    address: string;
    location: string;
    latitude?: number;
    longitude?: number;
    rating?: number;
    ratingCount?: number;
    amenities?: string[];
    categoryIds?: number[];
    images?: {
        url: string;
        altText?: string;
        displayOrder?: number;
    }[];
}
