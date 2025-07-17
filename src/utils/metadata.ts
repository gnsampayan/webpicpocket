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
				exifData.Flash;

			if (hasSettings) {
				metadata.settings = {
					fNumber: exifData.FNumber,
					exposureTime: exifData.ExposureTime,
					iso: exifData.ISO || exifData.ISOSpeedRatings,
					focalLength: exifData.FocalLength,
					flash:
						exifData.Flash !== undefined ? Boolean(exifData.Flash) : undefined,
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
			};
		}

		console.log("📸 [Metadata] Extracted metadata:", metadata);
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
