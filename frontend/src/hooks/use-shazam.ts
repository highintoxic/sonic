import { useState, useCallback } from "react";
import { shazamService } from "@/services/shazam.service";
import {
	AddSongRequest,
	AddSongResponse,
	IdentifySongRequest,
	IdentifySongResponse,
	ApiError,
} from "@/types/api";

interface UseShazamState {
	isLoading: boolean;
	error: string | null;
}

interface UseShazamReturn {
	// State
	isLoading: boolean;
	error: string | null;

	// Actions
	addSong: (request: AddSongRequest) => Promise<AddSongResponse | null>;
	identifySong: (
		request: IdentifySongRequest
	) => Promise<IdentifySongResponse | null>;
	clearError: () => void;
}

export const useShazam = (): UseShazamReturn => {
	const [state, setState] = useState<UseShazamState>({
		isLoading: false,
		error: null,
	});

	const clearError = useCallback(() => {
		setState((prev) => ({ ...prev, error: null }));
	}, []);

	const addSong = useCallback(
		async (request: AddSongRequest): Promise<AddSongResponse | null> => {
			setState((prev) => ({ ...prev, isLoading: true, error: null }));

			try {
				const response = await shazamService.addSong(request);

				if (response.success && response.data) {
					setState((prev) => ({ ...prev, isLoading: false }));
					return response.data;
				} else {
					throw new Error(response.error || "Failed to add song");
				}
			} catch (error) {
				const errorMessage =
					error instanceof ApiError
						? `${error.message}${error.details ? ` - ${error.details}` : ""}`
						: error instanceof Error
						? error.message
						: "An unknown error occurred";

				setState((prev) => ({
					...prev,
					isLoading: false,
					error: errorMessage,
				}));
				return null;
			}
		},
		[]
	);

	const identifySong = useCallback(
		async (
			request: IdentifySongRequest
		): Promise<IdentifySongResponse | null> => {
			setState((prev) => ({ ...prev, isLoading: true, error: null }));

			try {
				const response = await shazamService.identifySong(request);

				if (response.success && response.data) {
					setState((prev) => ({ ...prev, isLoading: false }));
					return response.data;
				} else {
					// Song not found is not an error, just no match
					setState((prev) => ({ ...prev, isLoading: false }));
					return null;
				}
			} catch (error) {
				const errorMessage =
					error instanceof ApiError
						? `${error.message}${error.details ? ` - ${error.details}` : ""}`
						: error instanceof Error
						? error.message
						: "An unknown error occurred";

				setState((prev) => ({
					...prev,
					isLoading: false,
					error: errorMessage,
				}));
				return null;
			}
		},
		[]
	);

	return {
		isLoading: state.isLoading,
		error: state.error,
		addSong,
		identifySong,
		clearError,
	};
};
