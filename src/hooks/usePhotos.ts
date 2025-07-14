import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import type { Photo } from '../types';

// Query keys for better cache management
export const photoKeys = {
  all: ['photos'] as const,
  lists: () => [...photoKeys.all, 'list'] as const,
  list: (filters: string) => [...photoKeys.lists(), { filters }] as const,
  details: () => [...photoKeys.all, 'detail'] as const,
  detail: (id: string) => [...photoKeys.details(), id] as const,
  event: (eventId: string) => [...photoKeys.all, 'event', eventId] as const,
  eventPhotos: (eventId: string) => [...photoKeys.all, 'event', eventId, 'photos'] as const,
  pocket: (pocketId: string) => [...photoKeys.all, 'pocket', pocketId] as const,
  pockets: () => [...photoKeys.all, 'pockets'] as const,
  events: (pocketId: string) => [...photoKeys.all, 'events', pocketId] as const,
};

// Hook to fetch all pockets
export const usePockets = () => {
  return useQuery({
    queryKey: photoKeys.pockets(),
    queryFn: () => api.getPockets(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });
};

// Hook to fetch events for a pocket
export const useEvents = (pocketId: string | undefined) => {
  return useQuery({
    queryKey: photoKeys.events(pocketId || ''),
    queryFn: () => api.getEvents(pocketId!),
    enabled: !!pocketId,
    staleTime: 3 * 60 * 1000, // 3 minutes
    gcTime: 8 * 60 * 1000, // 8 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });
};

// Hook to fetch event details with photos
export const useEventPhotos = (eventId: string | undefined) => {
  return useQuery({
    queryKey: photoKeys.eventPhotos(eventId || ''),
    queryFn: () => api.getEventDetails(eventId!),
    enabled: !!eventId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });
};

// Hook to get pocket and event data from URL parameters
export const usePocketAndEventFromUrl = (pocketTitle: string | undefined, eventTitle: string | undefined) => {
  const { data: pocketsData } = usePockets();
  
  const pocket = pocketsData?.find(p => {
    if (!pocketTitle) return false;
    const decodedPocketTitle = decodeURIComponent(pocketTitle);
    const pocketLastDashIndex = decodedPocketTitle.lastIndexOf('-');
    const pocketIdSuffix = pocketLastDashIndex !== -1 ? decodedPocketTitle.substring(pocketLastDashIndex + 1) : '';
    return p.pocket_id.endsWith(pocketIdSuffix);
  });

  const { data: eventsData } = useEvents(pocket?.pocket_id);
  
  const event = eventsData?.find(e => {
    if (!eventTitle) return false;
    const decodedEventTitle = decodeURIComponent(eventTitle);
    const eventLastDashIndex = decodedEventTitle.lastIndexOf('-');
    const eventIdSuffix = eventLastDashIndex !== -1 ? decodedEventTitle.substring(eventLastDashIndex + 1) : '';
    return e.id.endsWith(eventIdSuffix);
  });

  return {
    pocket,
    event,
    isLoading: !pocketsData || (pocket && !eventsData),
    error: !pocket ? 'Pocket not found' : !event ? 'Event not found' : null,
  };
};

// Hook to get pocket data from URL parameters (for EventView)
export const usePocketFromUrl = (pocketTitle: string | undefined) => {
  const { data: pocketsData, isLoading, error } = usePockets();
  
  const pocket = pocketsData?.find(p => {
    if (!pocketTitle) return false;
    const decodedPocketTitle = decodeURIComponent(pocketTitle);
    const lastDashIndex = decodedPocketTitle.lastIndexOf('-');
    const pocketIdSuffix = lastDashIndex !== -1 ? decodedPocketTitle.substring(lastDashIndex + 1) : '';
    return p.pocket_id.endsWith(pocketIdSuffix);
  });

  return {
    pocket,
    isLoading,
    error: error || (!pocket && pocketsData ? 'Pocket not found' : null),
  };
};

// Hook to fetch a specific photo by short ID (uses cached event data)
export const usePhotoByShortId = (
  pocketTitle: string | undefined,
  eventTitle: string | undefined,
  photoShortId: string | undefined
) => {
  const { event, isLoading: isLoadingPocketEvent, error: pocketEventError } = usePocketAndEventFromUrl(pocketTitle, eventTitle);
  const { data: eventData, isLoading: isLoadingEventPhotos, error: eventPhotosError } = useEventPhotos(event?.id);

  const isLoading = isLoadingPocketEvent || isLoadingEventPhotos;
  const error = pocketEventError || eventPhotosError;

  // Find the photo with the matching short ID
  const photoData = eventData ? (() => {
    const foundPhotoIndex = eventData.photos.findIndex((p: Photo) => p.id.slice(-6) === photoShortId);
    if (foundPhotoIndex === -1) return null;

    return {
      photo: eventData.photos[foundPhotoIndex],
      allPhotos: eventData.photos,
      currentIndex: foundPhotoIndex,
      eventData: eventData,
    };
  })() : null;

  return {
    data: photoData,
    isLoading,
    error: error || (!photoData && eventData ? 'Photo not found' : null),
  };
};

// Hook for favorite management
export const useFavoriteMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ photoId, isFavorite }: { photoId: string; isFavorite: boolean }) => {
      if (isFavorite) {
        return api.manageFavorite({ remove_favorite: [photoId] });
      } else {
        return api.manageFavorite({ add_favorite: [photoId] });
      }
    },
    onSuccess: (_, { photoId, isFavorite }) => {
      // Optimistically update any cached photo data
      queryClient.setQueriesData(
        { queryKey: photoKeys.all },
        (oldData: any) => {
          if (!oldData) return oldData;
          
          // Update photos in event data
          if (oldData.photos) {
            return {
              ...oldData,
              photos: oldData.photos.map((photo: Photo) =>
                photo.id === photoId
                  ? { ...photo, is_favorite: !isFavorite }
                  : photo
              ),
            };
          }
          
          return oldData;
        }
      );
    },
    onError: (error) => {
      console.error('Failed to toggle favorite:', error);
    },
  });
};

// Hook for photo deletion
export const useDeletePhotoMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (photoId: string) => {
      return api.deletePhoto(photoId);
    },
    onSuccess: (_, photoId) => {
      // Optimistically update any cached photo data
      queryClient.setQueriesData(
        { queryKey: photoKeys.all },
        (oldData: any) => {
          if (!oldData) return oldData;
          
          // Remove photo from event data
          if (oldData.photos) {
            return {
              ...oldData,
              photos: oldData.photos.filter((photo: Photo) => photo.id !== photoId),
              photo_count: oldData.photo_count - 1,
            };
          }
          
          return oldData;
        }
      );
    },
    onError: (error) => {
      console.error('Failed to delete photo:', error);
    },
  });
};

// Hook for adding media to event
export const useAddMediaMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ eventId, mediaFiles }: { eventId: string; mediaFiles: File[] }) => {
      // Upload files to S3 and associate with event
      const uploadedFiles = [];

      for (const file of mediaFiles) {
        // Step 1: Get upload URL
        const uploadResponse = await api.uploadMedia({
          files: [file.name],
        });

        if (!uploadResponse.uploads || uploadResponse.uploads.length === 0) {
          throw new Error('No upload URLs received');
        }

        const upload = uploadResponse.uploads[0];

        // Step 2: Upload to S3
        await api.uploadFileToS3(upload.upload_url, file);

        uploadedFiles.push({
          object_key: upload.object_key,
          metadata: null
        });
      }

      // Step 3: Associate uploaded files with event
      const addPhotoRequest = {
        add_photos: uploadedFiles
      };

      return await api.uploadPhotosToEvent(eventId, addPhotoRequest);
    },
    onSuccess: (_, { eventId }) => {
      // Invalidate event photos query to refetch with new photos
      queryClient.invalidateQueries({ queryKey: photoKeys.eventPhotos(eventId) });
      // Also invalidate pockets query to update photo counts
      queryClient.invalidateQueries({ queryKey: photoKeys.pockets() });
    },
    onError: (error) => {
      console.error('Failed to add media:', error);
    },
  });
};

// Hook for creating events
export const useCreateEventMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { title: string; pocket_id: string; additional_members?: string[] }) => {
      return api.createEvent(data);
    },
    onSuccess: (_, { pocket_id }) => {
      // Invalidate events query for this specific pocket
      queryClient.invalidateQueries({ queryKey: photoKeys.events(pocket_id) });
      // Also invalidate pockets query to update event counts
      queryClient.invalidateQueries({ queryKey: photoKeys.pockets() });
    },
    onError: (error) => {
      console.error('Failed to create event:', error);
    },
  });
};

// Hook for editing events
export const useEditEventMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ eventId, data }: { eventId: string; data: { title?: string; members_to_add?: string[] }; pocketId: string }) => {
      return api.editEvent(eventId, data);
    },
    onSuccess: (_, { eventId, pocketId }) => {
      // Invalidate events query for this specific pocket
      queryClient.invalidateQueries({ queryKey: photoKeys.events(pocketId) });
      // Also invalidate event photos query
      queryClient.invalidateQueries({ queryKey: photoKeys.eventPhotos(eventId) });
    },
    onError: (error) => {
      console.error('Failed to edit event:', error);
    },
  });
};

// Hook for creating pockets
export const useCreatePocketMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { title: string; members?: string[]; cover_photo_object_key?: string }) => {
      return api.createPocket(data);
    },
    onSuccess: () => {
      // Invalidate pockets query
      queryClient.invalidateQueries({ queryKey: photoKeys.pockets() });
    },
    onError: (error) => {
      console.error('Failed to create pocket:', error);
    },
  });
};

// Hook for updating pockets
export const useUpdatePocketMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ pocketId, data }: { pocketId: string; data: { title?: string; cover_photo_object_key?: string; add_members?: string[] } }) => {
      return api.updatePocket(pocketId, data);
    },
    onSuccess: () => {
      // Invalidate pockets query
      queryClient.invalidateQueries({ queryKey: photoKeys.pockets() });
    },
    onError: (error) => {
      console.error('Failed to update pocket:', error);
    },
  });
};

// =============================================
// COMMENT HOOKS
// =============================================

// Query keys for comments
export const commentKeys = {
  all: ['comments'] as const,
  lists: () => [...commentKeys.all, 'list'] as const,
  list: (photoId: string) => [...commentKeys.lists(), photoId] as const,
};

// Hook to fetch comments for a photo
export const useComments = (photoId: string | undefined) => {
  return useQuery({
    queryKey: commentKeys.list(photoId || ''),
    queryFn: () => api.getPhotoComments(photoId!),
    enabled: !!photoId,
    staleTime: 1 * 60 * 1000, // 1 minute
    gcTime: 3 * 60 * 1000, // 3 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });
};

// Hook for adding comments
export const useAddCommentMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ photoId, text }: { photoId: string; text: string }) => {
      return api.addComment(photoId, { text });
    },
    onSuccess: (_, { photoId }) => {
      // Invalidate comments query for this photo
      queryClient.invalidateQueries({ queryKey: commentKeys.list(photoId) });
      // Also invalidate photo details to update comment count
      queryClient.invalidateQueries({ queryKey: photoKeys.all });
    },
    onError: (error) => {
      console.error('Failed to add comment:', error);
    },
  });
};

// Hook for editing comments
export const useEditCommentMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ commentId, text }: { commentId: string; text: string; photoId: string }) => {
      return api.editComment(commentId, { text });
    },
    onSuccess: (_, { photoId }) => {
      // Invalidate only the specific photo's comments query
      queryClient.invalidateQueries({ queryKey: commentKeys.list(photoId) });
    },
    onError: (error) => {
      console.error('Failed to edit comment:', error);
    },
  });
};

// Hook for deleting comments
export const useDeleteCommentMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (commentId: string) => {
      return api.deleteComment(commentId);
    },
    onSuccess: () => {
      // Invalidate all comments queries since we don't know the photoId
      queryClient.invalidateQueries({ queryKey: commentKeys.all });
      // Also invalidate photo details to update comment count
      queryClient.invalidateQueries({ queryKey: photoKeys.all });
    },
    onError: (error) => {
      console.error('Failed to delete comment:', error);
    },
  });
}; 