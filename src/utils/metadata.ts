import exifr from "exifr";

export interface ExtractedMetadata {
	dateTimeOriginal?: string;
	camera?: {
		make?: string;
		model?: string;
		lens?: string;
	};
	settings?: {
		fNumber?: number;
		exposureTime?: number;
		iso?: number;
		focalLength?: number;
		flash?: boolean;
	};
	location?: {
		latitude?: number;
		longitude?: number;
		altitude?: number;
	};
	dimensions?: {
		width?: number;
		height?: number;
	};
	fileSize?: number;
	mimeType?: string;
	[key: string]: any;
}

/**
 * Parse EXIF Flash data which can be either a numeric bit field or a string description
 * @param flashValue - The raw flash value from EXIF data
 * @returns boolean | undefined - True if flash fired, false if not, undefined if unknown
 */
function parseFlashData(flashValue: any): boolean | undefined {
	if (flashValue === undefined || flashValue === null) {
		return undefined;
	}

	// If it's already a string description, parse it
	if (typeof flashValue === "string") {
		const lowerValue = flashValue.toLowerCase();
		if (lowerValue.includes("flash fired") || lowerValue.includes("flash on")) {
			return true;
		} else if (
			lowerValue.includes("did not fire") ||
			lowerValue.includes("no flash")
		) {
			return false;
		}
		return undefined;
	}

	// If it's a number, parse as bit field
	const flashNum =
		typeof flashValue === "number" ? flashValue : parseInt(flashValue, 10);

	if (isNaN(flashNum)) {
		return undefined;
	}

	// EXIF Flash is a bit field where bit 0 indicates if flash fired
	// Bit 0 (LSB): 0 = Flash did not fire, 1 = Flash fired
	return (flashNum & 0x01) === 0x01;
}

/**
 * Get a human-readable description of flash usage from EXIF flash value
 * @param flashValue - The raw flash value from EXIF data (can be string or number)
 * @returns string - Human-readable flash description
 */
export function getFlashDescription(flashValue: any): string {
	if (flashValue === undefined || flashValue === null) {
		return "Unknown";
	}

	// If it's already a string description from the EXIF library, return it directly
	if (typeof flashValue === "string") {
		return flashValue;
	}

	// If it's a number, convert to human-readable description
	const flashNum =
		typeof flashValue === "number" ? flashValue : parseInt(flashValue, 10);

	if (isNaN(flashNum)) {
		return "Unknown";
	}

	// Common flash values and their meanings
	const flashDescriptions: Record<number, string> = {
		0x00: "No flash",
		0x01: "Flash fired",
		0x05: "Flash fired, return not detected",
		0x07: "Flash fired, return detected",
		0x08: "Flash on, did not fire",
		0x09: "Flash fired, compulsory flash mode",
		0x0d: "Flash fired, compulsory flash mode, return not detected",
		0x0f: "Flash fired, compulsory flash mode, return detected",
		0x10: "Flash did not fire, compulsory flash off mode",
		0x14: "Flash did not fire, compulsory flash off mode, no flash function",
		0x18: "Flash did not fire, auto mode",
		0x19: "Flash fired, auto mode",
		0x1d: "Flash fired, auto mode, return not detected",
		0x1f: "Flash fired, auto mode, return detected",
		0x20: "No flash function",
		0x30: "Flash did not fire, compulsory flash off mode, no flash function",
		0x41: "Flash fired, red-eye reduction mode",
		0x45: "Flash fired, red-eye reduction mode, return not detected",
		0x47: "Flash fired, red-eye reduction mode, return detected",
		0x49: "Flash fired, compulsory flash mode, red-eye reduction mode",
		0x4d: "Flash fired, compulsory flash mode, red-eye reduction mode, return not detected",
		0x4f: "Flash fired, compulsory flash mode, red-eye reduction mode, return detected",
		0x50: "Flash did not fire, compulsory flash off mode, red-eye reduction mode",
		0x58: "Flash did not fire, auto mode, red-eye reduction mode",
		0x59: "Flash fired, auto mode, red-eye reduction mode",
		0x5d: "Flash fired, auto mode, red-eye reduction mode, return not detected",
		0x5f: "Flash fired, auto mode, red-eye reduction mode, return detected",
	};

	// Return exact match if available
	if (flashDescriptions[flashNum]) {
		return flashDescriptions[flashNum];
	}

	// Fallback to basic analysis
	const flashFired = (flashNum & 0x01) === 0x01;
	const redEyeReduction = (flashNum & 0x40) === 0x40;
	const compulsoryFlash = (flashNum & 0x08) === 0x08;
	const autoMode = (flashNum & 0x18) === 0x18;

	let description = flashFired ? "Flash fired" : "Flash did not fire";

	if (redEyeReduction) {
		description += ", red-eye reduction";
	}

	if (compulsoryFlash) {
		description += ", compulsory mode";
	} else if (autoMode) {
		description += ", auto mode";
	}

	return description;
}

/**
 * Extracts metadata from an image file using EXIF data
 * @param file - The image file to extract metadata from
 * @returns Promise<ExtractedMetadata> - The extracted metadata
 */
export async function extractImageMetadata(
	file: File
): Promise<ExtractedMetadata> {
	try {
		// Extract EXIF data using exifr with correct configuration
		const exifData = await exifr.parse(file, {
			pick: [
				"DateTimeOriginal",
				"DateTime",
				"CreateDate",
				"DateCreated",
				"Make",
				"Model",
				"LensModel",
				"LensInfo",
				"FNumber",
				"ExposureTime",
				"ISO",
				"ISOSpeedRatings",
				"FocalLength",
				"Flash",
				"latitude",
				"longitude",
				"altitude",
				"ExifImageWidth",
				"ExifImageHeight",
				"ImageWidth",
				"ImageHeight",
				"Orientation",
				"ColorSpace",
				"WhiteBalance",
				"MeteringMode",
				"ExposureMode",
				"SceneCaptureType",
			],
		});

		const metadata: ExtractedMetadata = {
			// File information
			fileSize: file.size,
			mimeType: file.type,
		};

		if (exifData) {
			// Date and time - prioritize DateTimeOriginal, fallback to DateTime or CreateDate
			const dateTimeOriginal =
				exifData.DateTimeOriginal ||
				exifData.DateTime ||
				exifData.CreateDate ||
				exifData.DateCreated;

			if (dateTimeOriginal) {
				// Convert to ISO string format
				metadata.dateTimeOriginal =
					dateTimeOriginal instanceof Date
						? dateTimeOriginal.toISOString()
						: new Date(dateTimeOriginal).toISOString();
			}

			// Camera information
			if (exifData.Make || exifData.Model || exifData.LensModel) {
				metadata.camera = {
					make: exifData.Make,
					model: exifData.Model,
					lens: exifData.LensModel || exifData.LensInfo,
				};
			}

			// Camera settings
			const hasSettings =
				exifData.FNumber ||
				exifData.ExposureTime ||
				exifData.ISO ||
				exifData.FocalLength ||
				exifData.Flash !== undefined;

			if (hasSettings) {
				metadata.settings = {
					fNumber: exifData.FNumber,
					exposureTime: exifData.ExposureTime,
					iso: exifData.ISO || exifData.ISOSpeedRatings,
					focalLength: exifData.FocalLength,
					flash: parseFlashData(exifData.Flash),
				};
			}

			// GPS/Location data
			if (exifData.latitude && exifData.longitude) {
				metadata.location = {
					latitude: exifData.latitude,
					longitude: exifData.longitude,
					altitude: exifData.altitude,
				};
			}

			// Image dimensions
			if (exifData.ExifImageWidth && exifData.ExifImageHeight) {
				metadata.dimensions = {
					width: exifData.ExifImageWidth,
					height: exifData.ExifImageHeight,
				};
			} else if (exifData.ImageWidth && exifData.ImageHeight) {
				metadata.dimensions = {
					width: exifData.ImageWidth,
					height: exifData.ImageHeight,
				};
			}

			// Store some useful raw EXIF data for debugging/future use
			metadata.rawExif = {
				orientation: exifData.Orientation,
				colorSpace: exifData.ColorSpace,
				whiteBalance: exifData.WhiteBalance,
				meteringMode: exifData.MeteringMode,
				exposureMode: exifData.ExposureMode,
				sceneCaptureType: exifData.SceneCaptureType,
				flashRaw: exifData.Flash, // Store raw flash value for debugging
			};
		}

		console.log("📸 [Metadata] Extracted metadata:", metadata);

		// Special logging for flash data to help debug flash issues
		if (exifData?.Flash !== undefined) {
			console.log("📸 [Metadata] Flash debug:", {
				rawFlashValue: exifData.Flash,
				rawFlashType: typeof exifData.Flash,
				flashFired: metadata.settings?.flash,
				flashDescription: getFlashDescription(exifData.Flash),
				isString: typeof exifData.Flash === "string",
				isNumber: typeof exifData.Flash === "number",
			});
		}

		return metadata;
	} catch (error) {
		console.warn("⚠️ [Metadata] Failed to extract EXIF data:", error);

		// Return basic file metadata even if EXIF extraction fails
		return {
			fileSize: file.size,
			mimeType: file.type,
			dateTimeOriginal: new Date().toISOString(), // Fallback to current time
		};
	}
}

/**
 * Extracts basic metadata from any file type
 * @param file - The file to extract metadata from
 * @returns Promise<ExtractedMetadata> - The extracted metadata
 */
export async function extractFileMetadata(
	file: File
): Promise<ExtractedMetadata> {
	// For image files, use full EXIF extraction
	if (file.type.startsWith("image/")) {
		return extractImageMetadata(file);
	}

	// For other file types, return basic metadata
	return {
		fileSize: file.size,
		mimeType: file.type,
		dateTimeOriginal: new Date().toISOString(), // Current time as fallback
	};
}
