import React, { useState, useRef, useEffect } from 'react';
import { api } from '../../services/api';
import { type Event } from '../../types';
import { useClaimPhotosToEventMutation, useMultipleFileUpload, type UploadFile } from '../../hooks/useMedia';
import './AddMediaModal.css';

interface AddPocketPhotosModalProps {
    isOpen: boolean;
    onClose: () => void;
    onMediaAdded?: () => void;
    pocketId: string;
    pocketTitle: string;
}

const AddPocketPhotosModal: React.FC<AddPocketPhotosModalProps> = ({
    isOpen,
    onClose,
    onMediaAdded,
    pocketId,
    pocketTitle
}) => {
    const [selectedFiles, setSelectedFiles] = useState<UploadFile[]>([]);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [events, setEvents] = useState<Event[]>([]);
    const [selectedEventId, setSelectedEventId] = useState<string>('');
    const [loadingEvents, setLoadingEvents] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Use shared upload hooks
    const { uploadFile } = useMultipleFileUpload();
    const claimPhotosMutation = useClaimPhotosToEventMutation();

    // Fetch events for this pocket
    useEffect(() => {
        const fetchEvents = async () => {
            if (!isOpen || !pocketId) return;

            try {
                setLoadingEvents(true);
                const eventsData = await api.getEvents(pocketId);
                setEvents(eventsData);

                // Auto-select the first event if available
                if (eventsData.length > 0 && !selectedEventId) {
                    setSelectedEventId(eventsData[0].id);
                }
            } catch (err) {
                console.error('Error fetching events:', err);
                setError('Failed to load events');
            } finally {
                setLoadingEvents(false);
            }
        };

        fetchEvents();
    }, [isOpen, pocketId, selectedEventId]);

    // Update file progress
    const updateFileProgress = (fileId: string, progress: Partial<UploadFile>) => {
        setSelectedFiles(prev => prev.map(f =>
            f.id === fileId ? { ...f, ...progress } : f
        ));
    };

    // Handle file selection
    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        const newFiles: UploadFile[] = files.map(file => ({
            id: Math.random().toString(36).substr(2, 9),
            file,
            preview: URL.createObjectURL(file),
            uploading: false,
            uploadProgress: 0
        }));

        setSelectedFiles(prev => [...prev, ...newFiles]);
        setError(null);

        // Clear the input for future selections
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }

        // Immediately upload each new file to S3
        for (const file of newFiles) {
            uploadFile(file, updateFileProgress);
        }
    };

    // Remove a file from the selection
    const handleRemoveFile = (fileId: string) => {
        setSelectedFiles(prev => {
            const fileToRemove = prev.find(f => f.id === fileId);
            if (fileToRemove?.preview) {
                URL.revokeObjectURL(fileToRemove.preview);
            }
            return prev.filter(f => f.id !== fileId);
        });
    };

    // Submit media to event
    const handleSubmit = async () => {
        if (selectedFiles.length === 0) {
            setError('Please select at least one photo');
            return;
        }

        if (!selectedEventId) {
            setError('Please select an event to add photos to');
            return;
        }

        // Check if all files have object keys
        const filesWithoutObjectKeys = selectedFiles.filter(f => !f.objectKey);
        if (filesWithoutObjectKeys.length > 0) {
            setError('Please wait for all files to finish uploading');
            return;
        }

        setSubmitting(true);
        setError(null);

        try {
            console.log('🔄 [AddPocketPhotosModal] Claiming photos to event');

            // Prepare photo data for claiming
            const photoData = selectedFiles
                .filter(file => file.objectKey) // Only include files that have been uploaded
                .map(file => ({
                    objectKey: file.objectKey!,
                    file: file.file
                }));

            console.log('🔄 [AddPocketPhotosModal] Selected files:', selectedFiles.length);
            console.log('🔄 [AddPocketPhotosModal] Files with object keys:', photoData.length);

            // Use the claim photos mutation
            await claimPhotosMutation.mutateAsync({
                eventId: selectedEventId,
                photoData
            });

            console.log('✅ [AddPocketPhotosModal] Photos claimed successfully to event');

            // Call the callback to trigger a refetch of event data
            onMediaAdded?.();

            // Close modal and reset state
            handleClose();
        } catch (err) {
            console.error('❌ [AddPocketPhotosModal] Failed to claim photos:', err);
            setError(err instanceof Error ? err.message : 'Failed to add photos to event');
        } finally {
            setSubmitting(false);
        }
    };

    // Handle modal close
    const handleClose = () => {
        // Clean up object URLs
        selectedFiles.forEach(file => {
            if (file.preview) {
                URL.revokeObjectURL(file.preview);
            }
        });

        setSelectedFiles([]);
        setError(null);
        setSelectedEventId('');
        onClose();
    };

    // Handle modal overlay click
    const handleModalOverlayClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            handleClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="add-media-modal-overlay" onClick={handleModalOverlayClick}>
            <div className="add-media-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Add Photos to {pocketTitle}</h2>
                    <button onClick={handleClose} className="close-button" disabled={submitting}>
                        ✕
                    </button>
                </div>

                <div className="modal-body">
                    {error && (
                        <div className="error-message">
                            {error}
                        </div>
                    )}

                    {/* Event Selection */}
                    <div className="event-selection-section">
                        <label htmlFor="event-select">Select Event:</label>
                        <select
                            id="event-select"
                            value={selectedEventId}
                            onChange={(e) => setSelectedEventId(e.target.value)}
                            disabled={loadingEvents || submitting}
                            className="event-select-dropdown"
                        >
                            <option value="">Choose an event...</option>
                            {events.map((event) => (
                                <option key={event.id} value={event.id}>
                                    {event.title} ({event.photo_count} photos)
                                </option>
                            ))}
                        </select>
                        {loadingEvents && (
                            <div className="loading-indicator">Loading events...</div>
                        )}
                        {events.length === 0 && !loadingEvents && (
                            <div className="no-events-message">
                                No events found in this pocket. Create an event first.
                            </div>
                        )}
                    </div>

                    {/* File Selection */}
                    <div className="file-selection-section">
                        <div className="file-input-container">
                            <input
                                ref={fileInputRef}
                                type="file"
                                multiple
                                accept="image/*"
                                onChange={handleFileSelect}
                                style={{ display: 'none' }}
                            />
                            <button
                                className="select-files-button"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={submitting || !selectedEventId}
                            >
                                <span>📷</span>
                                Select Photos
                            </button>
                        </div>
                    </div>

                    {/* Selected Files List */}
                    {selectedFiles.length > 0 && (
                        <div className="selected-files-section">
                            <h3>Selected Photos ({selectedFiles.length})</h3>
                            <div className="files-grid">
                                {selectedFiles.map((file) => (
                                    <div key={file.id} className="file-item">
                                        <div className="file-preview">
                                            <img src={file.preview} alt="Preview" />
                                            <button
                                                className="remove-file-button"
                                                onClick={() => handleRemoveFile(file.id)}
                                                disabled={submitting}
                                            >
                                                ✕
                                            </button>
                                        </div>
                                        <div className="file-info">
                                            <span className="file-name">{file.file.name}</span>
                                            <span className="file-size">
                                                {(file.file.size / 1024 / 1024).toFixed(1)} MB
                                            </span>
                                        </div>
                                        <div className="file-status">
                                            {file.uploading && (
                                                <div className="upload-status">
                                                    <div className="upload-spinner"></div>
                                                    <span>Uploading...</span>
                                                </div>
                                            )}
                                            {file.objectKey && (
                                                <div className="upload-success">
                                                    <span>✅ Uploaded</span>
                                                </div>
                                            )}
                                            {file.uploadError && (
                                                <div className="upload-error">
                                                    <span>❌ {file.uploadError}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Upload Progress Summary */}
                    {selectedFiles.length > 0 && (
                        (() => {
                            const readyFiles = selectedFiles.filter(f => f.objectKey);
                            const uploadingFiles = selectedFiles.filter(f => f.uploading);
                            const errorFiles = selectedFiles.filter(f => f.uploadError);
                            const hasUploadingFiles = uploadingFiles.length > 0;

                            return (
                                <>
                                    {hasUploadingFiles && (
                                        <div className="upload-summary">
                                            <div className="upload-progress-bar">
                                                <div
                                                    className="progress-fill"
                                                    style={{
                                                        width: `${(readyFiles.length / selectedFiles.length) * 100}%`
                                                    }}
                                                ></div>
                                            </div>
                                            <span>
                                                {readyFiles.length} of {selectedFiles.length} files uploaded
                                                {uploadingFiles.length > 0 && ` (${uploadingFiles.length} uploading...)`}
                                            </span>
                                        </div>
                                    )}

                                    {/* Error Summary */}
                                    {errorFiles.length > 0 && (
                                        <div className="error-summary">
                                            <span>❌ {errorFiles.length} file(s) failed to upload</span>
                                        </div>
                                    )}

                                    {/* Submission Progress */}
                                    {submitting && (
                                        <div className="upload-summary">
                                            <div className="upload-spinner"></div>
                                            <span>Adding {selectedFiles.length} photo(s) to event...</span>
                                        </div>
                                    )}
                                </>
                            );
                        })()
                    )}
                </div>

                <div className="modal-actions">
                    <button
                        type="button"
                        onClick={handleClose}
                        className="cancel-button"
                        disabled={submitting}
                    >
                        Cancel
                    </button>

                    <button
                        type="button"
                        onClick={handleSubmit}
                        className="submit-button"
                        disabled={
                            (() => {
                                const readyFiles = selectedFiles.filter(f => f.objectKey);
                                const uploadingFiles = selectedFiles.filter(f => f.uploading);
                                const hasUploadingFiles = uploadingFiles.length > 0;

                                return submitting ||
                                    hasUploadingFiles ||
                                    selectedFiles.length === 0 ||
                                    readyFiles.length !== selectedFiles.length ||
                                    !selectedEventId;
                            })()
                        }
                    >
                        {submitting ? 'Adding to Event...' : 'Add to Event'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AddPocketPhotosModal; 