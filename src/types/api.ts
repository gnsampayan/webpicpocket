/**
 * TypeScript interfaces for API requests and responses
 */

// =============================================
// AUTHENTICATION INTERFACES
// =============================================
export interface RegisterData {
	username: string;
	first_name: string;
	last_name: string;
	password: string;
	email: string;
}

export interface LoginData {
	username: string;
	password: string;
}

export interface UserInfo {
	id: string;
	username: string;
	first_name: string;
	last_name: string;
	description?: string;
	profile_picture_default: boolean;
	profile_picture: {
		url_small?: string;
		url_medium?: string;
		url_large?: string;
		[key: string]: any;
	};
	verified?: boolean;
}

export interface PublicUserInfo {
	id: string;
	username: string;
	first_name: string;
	last_name: string;
	description?: string;
	profile_picture_default: boolean;
	profile_picture: {
		url_small?: string;
		url_medium?: string;
		url_large?: string;
		[key: string]: any;
	};
	can_add_contact: boolean;
	placeholder?: boolean;
}

export interface RegisterResponse {
	id: string;
	username: string;
	email: string;
	first_name: string;
	last_name: string;
	description?: string;
}

export interface AuthResponse {
	user_info: UserInfo;
	access_token: string;
	refresh_token: string;
	verified: boolean;
}

export interface ApiError {
	error: string;
}

export interface LoginResponse {
	user_info: UserInfo;
	access_token: string;
	refresh_token: string;
	verified: boolean;
}

export interface VerifyEmailResponse {
	email_address: string;
	next_attempt: string;
	expires_at: string;
}

export interface ValidateEmailResponse {
	access_token: string;
}

// =============================================
// UPLOAD INTERFACES
// =============================================
export type MimeType =
	| "image/jpeg"
	| "image/png"
	| "video/mp4"
	| "audio/mpeg"
	| "audio/webm"
	| "audio/mp4"
	| "audio/wav"
	| "audio/ogg"
	| "audio/mp3"
	| "audio/wma"
	| "audio/flac"
	| "audio/aac"
	| "audio/ape"
	| "audio/opus"
	| "image/webp"

export interface UploadRequest {
	files: string[];
}

export interface UploadResponse {
	uploads: {
		filename: string;
		object_key: string;
		upload_url: string;
	}[];
}

export interface UpdateProfileRequest {
	profile_object_key?: string;
	first_name?: string;
	last_name?: string;
	description?: string;
	email?: string;
	old_password?: string;
	new_password?: string;
}

export type AcceptedMimeTypes = {
	profile: ("image/jpeg" | "image/png" | "image/webp")[];
	cover: ("image/jpeg" | "image/png" | "image/webp")[];
	photo: ("image/jpeg" | "image/png" | "image/webp")[];
	video: "video/mp4"[];
	comment: ("audio/mpeg" | "audio/webm" | "audio/mp4" | "audio/wav" | "audio/ogg")[];
};

// =============================================
// CONTACT INTERFACES
// =============================================
export interface ContactUser {
	id: string;
	username: string;
	first_name: string;
	last_name: string;
	email: string;
	description?: string;
	profile_picture_default: boolean;
	profile_picture: {
		url_small?: string;
		url_medium?: string;
		url_large?: string;
		[key: string]: any;
	};
}

export interface UserProfile {
	id: string;
	username: string;
	first_name: string;
	last_name: string;
	email: string;
	description?: string;
	profile_picture_url?: string;
	profile_picture_default?: boolean;
	profile_picture?: {
		url_small?: string;
		url_medium?: string;
		url_large?: string;
		[key: string]: any;
	};
}

export interface ContactRequest {
	id: string;
	status: "pending" | "accepted" | "rejected";
	created_at: string;
	updated_at: string;
}

export interface ContactRequestResponse {
	requesting_user: ContactUser;
	recipient: ContactUser;
	contact_request: ContactRequest;
	deleted?: boolean;
}

export interface ContactsResponse {
	contacts: ContactUser[];
	contact_requests_received?: ContactUser[];
	contact_requests_sent?: ContactUser[];
	placeholder_contacts?: PlaceholderContact[];
}

export interface ContactUpdateRequest {
	cancel?: boolean;
	accept?: boolean;
	reject?: boolean;
	delete?: boolean;
}

export interface CreatePlaceholderRequest {
	first_name: string;
	last_name: string;
	description?: string;
	profile_object_key?: string;
}

export interface PlaceholderContact extends ContactUser {
	placeholder: true;
	description?: string;
	profile_object_key?: string;
}

// =============================================
// PROFILE PICTURE INTERFACES
// =============================================
export interface UserProfilePictureResponse {
	id: string;
	username: string;
	first_name: string;
	last_name: string;
	email: string;
	description?: string;
	profile_picture_default: boolean;
	profile_picture: {
		url_small?: string;
		url_medium?: string;
		url_large?: string;
		[key: string]: any;
	};
}

// =============================================
// POCKET/ALBUM INTERFACES
// =============================================
export interface PocketMember {
	id: string;
	username: string;
	first_name: string;
	last_name: string;
	description?: string;
	profile_picture_default: boolean;
	profile_picture: {
		url_small?: string;
		url_medium?: string;
		url_large?: string;
		[key: string]: any;
	};
}

export interface Pocket {
	pocket_id: string;
	pocket_title: string;
	cover_photo_default: boolean;
	cover_photo_url: {
		url_small: string;
		url_med: string;
		url_large: string;
	};
	pocket_members: PocketMember[];
	pocket_created_at: string;
	pocket_updated_at: string;
	pocket_last_activity_at: string;
}

export interface CreatePocketRequest {
	title: string;
	members?: string[];
	cover_photo_object_key?: string;
}

export interface UpdatePocketRequest {
	title?: string;
	cover_photo_object_key?: string;
	add_members?: string[];
}

// =============================================
// COMMENT INTERFACES
// =============================================
export interface Comment {
	id: string;
	photo_id: string;
	text: string;
	created_at: string;
	updated_at: string;
	deleted_at: string | null;
}

export interface CreateCommentRequest {
	text?: string;
	object_key?: string;
}

export interface EditCommentRequest {
	text: string;
}

// =============================================
// PHOTO INTERFACES
// =============================================
export type MediaTypeInEvent = "photo" | "video";

export interface PhotosToAddInEvent {
	object_key: string;
	metadata?: string | null | Record<string, any>;
}

export interface VideosToAddInEvent {
	object_key: string;
}

export interface AddPhotoRequest {
	add_photos: PhotosToAddInEvent[];
}

export interface AddVideoRequest {
	add_videos: VideosToAddInEvent[];
}

export interface PhotoView {
	id: string;
	object_key: string;
	metadata: string;
	author: PocketMember;
	created_at: string;
	updated_at: string;
}

export interface PhotoCommentView {
	id: string;
	author: PocketMember;
	object_url?: string;
	content?: string;
	created_at: string;
	updated_at: string;
	edited?: boolean;
}

export interface PhotoDetails {
	photo_author: PocketMember;
	photo_metadata: Record<string, any>;
	comments: PhotoCommentView[];
}

export interface FavoritePhotoRequest {
	add_favorite?: string[];
	remove_favorite?: string[];
}

// =============================================
// SUB-ALBUM/EVENT INTERFACES
// =============================================
export interface PhotoMetadata {
	camera_model?: string;
	taken_at?: string;
	location?: string;
	[key: string]: any;
}

export interface Media {
	id: string;
	owner_id: string;
	photo_url?:
		| string
		| {
				url_small: string;
				url_med: string;
				url_large?: string;
		  };
	video_url?: string;
	is_favorite: boolean;
	media_type: "photo" | "video";
	comment_count: number;
	created_at: string;
	can_delete: boolean;
	locks_at: string;
	updated_at: string;
	date_taken?: string;
}

export interface PreviewPhoto {
	id: string;
	owner_id: string;
	photo_url:
		| string
		| {
				url_small: string;
				url_med: string;
				url_large?: string;
		  };
	is_favorite: boolean;
	media_type: "photo" | "video";
	comment_count: number;
	created_at: string;
	can_delete: boolean;
	locks_at: string;
	updated_at: string;
}

export interface Event {
	id: string;
	title: string;
	photo_count: number;
	additional_member_count: number;
	additional_members: ContactUser[];
	preview_photos: PreviewPhoto[];
	created_at: string;
	updated_at: string;
	inherited: boolean;
	source_pocket_id?: string;
	date_range_start?: string;
	date_range_end?: string;
}

export interface EventDetailsResponse {
	additional_member_count: number;
	additional_members: ContactUser[];
	created_at: string;
	current_user_add_permissions: boolean;
	current_user_added: boolean;
	event_id: string;
	photo_count: number;
	photos: Media[];
	title: string;
	updated_at: string;
}

export interface CreateEventRequest {
	title: string;
	pocket_id: string;
	additional_members?: string[]; // Additional members to add to the event that are not in the pocket
}

export interface EditEventRequest {
	title?: string;
	members_to_add?: string[]; // Additional members to add to the event that are not in the pocket
}
