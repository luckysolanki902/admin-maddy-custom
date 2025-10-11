import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

const API_BASE = "/api/site-updates";
const CACHE_KEY = "siteUpdatesCache.v1";
const CACHE_DURATION_MS = 5 * 60 * 1000;
const MAX_CACHED_ITEMS = 50;

const isBrowser = typeof window !== "undefined";

function mergeUpdateLists(existingList = [], incomingList = []) {
  const map = new Map();

  existingList.forEach((item) => {
    if (item?._id) {
      map.set(item._id, item);
    }
  });

  incomingList.forEach((item) => {
    if (item?._id) {
      map.set(item._id, item);
    }
  });

  return Array.from(map.values())
    .sort((a, b) => new Date(b.effectiveAt) - new Date(a.effectiveAt))
    .slice(0, MAX_CACHED_ITEMS);
}

function readCachedUpdates() {
  if (!isBrowser) return null;
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!parsed?.timestamp) return null;

    if (Date.now() - parsed.timestamp > CACHE_DURATION_MS) {
      window.localStorage.removeItem(CACHE_KEY);
      return null;
    }

    return {
      items: mergeUpdateLists([], parsed.items ?? []),
      nextCursor: parsed.nextCursor ?? null,
      hasMore: Boolean(parsed.hasMore),
      timestamp: parsed.timestamp,
    };
  } catch (error) {
    console.warn("Failed to read site updates cache", error);
    return null;
  }
}

function persistClientCache(state) {
  if (!isBrowser) return;
  try {
    const payload = {
      items: state.items.slice(0, MAX_CACHED_ITEMS),
      nextCursor: state.nextCursor ?? null,
      hasMore: Boolean(state.hasMore),
      timestamp: state.lastFetched ?? Date.now(),
    };
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(payload));
  } catch (error) {
    console.warn("Failed to persist site updates cache", error);
  }
}

export const fetchSiteUpdates = createAsyncThunk(
  "siteUpdates/fetch",
  async (params = {}, { rejectWithValue }) => {
    try {
      const { cursor = null, pageSize, useCache = true } = params ?? {};
      const isInitialLoad = !cursor;

      if (useCache && isInitialLoad) {
        const cached = readCachedUpdates();
        if (cached?.items?.length) {
          return {
            updates: cached.items,
            nextCursor: cached.nextCursor,
            hasMore: cached.hasMore,
            cursor: null,
            fromCache: true,
            timestamp: cached.timestamp,
          };
        }
      }

      const search = new URLSearchParams();
      const resolvedPageSize = Number.isFinite(pageSize)
        ? pageSize
        : cursor
        ? 10
        : 3;

      if (resolvedPageSize) {
        search.set("pageSize", String(resolvedPageSize));
      }
      if (cursor) {
        search.set("cursor", cursor);
      }

      const response = await fetch(
        `${API_BASE}${search.size ? `?${search.toString()}` : ""}`,
        { credentials: "include" }
      );

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        return rejectWithValue(error?.message || "Failed to fetch updates");
      }

      const data = await response.json();
      return {
        updates: data.updates || [],
        nextCursor: data.nextCursor ?? null,
        hasMore: Boolean(data.hasMore),
        cursor: cursor ?? null,
        fromCache: false,
        timestamp: Date.now(),
      };
    } catch (error) {
      return rejectWithValue(error.message || "Failed to fetch updates");
    }
  }
);

export const createSiteUpdate = createAsyncThunk("siteUpdates/create", async (payload, { rejectWithValue }) => {
  try {
    const response = await fetch(API_BASE, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      return rejectWithValue(error?.message || "Failed to create update");
    }

    const data = await response.json();
    return data.update;
  } catch (error) {
    return rejectWithValue(error.message || "Failed to create update");
  }
});

export const patchSiteUpdate = createAsyncThunk("siteUpdates/update", async ({ id, payload }, { rejectWithValue }) => {
  try {
    const response = await fetch(`${API_BASE}/${id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      return rejectWithValue(error?.message || "Failed to update");
    }

    const data = await response.json();
    return data.update;
  } catch (error) {
    return rejectWithValue(error.message || "Failed to update");
  }
});

const initialState = {
  items: [],
  status: "idle",
  error: null,
  nextCursor: null,
  hasMore: false,
  lastFetched: null,
  loadingMore: false,
};

const siteUpdatesSlice = createSlice({
  name: "siteUpdates",
  initialState,
  reducers: {
    resetSiteUpdates: () => {
      if (isBrowser) {
        try {
          window.localStorage.removeItem(CACHE_KEY);
        } catch (error) {
          console.warn("Failed to clear site updates cache", error);
        }
      }
      return { ...initialState };
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSiteUpdates.pending, (state, action) => {
        const isLoadMore = Boolean(action.meta?.arg?.cursor);
        if (isLoadMore) {
          state.loadingMore = true;
        } else {
          state.status = "loading";
          state.error = null;
        }
      })
      .addCase(fetchSiteUpdates.fulfilled, (state, action) => {
        const { updates, nextCursor, hasMore, cursor, fromCache, timestamp } = action.payload;
        state.status = "succeeded";
        state.loadingMore = false;
        state.error = null;

        if (cursor) {
          state.items = mergeUpdateLists(state.items, updates);
        } else {
          state.items = mergeUpdateLists([], updates);
        }

        state.nextCursor = nextCursor;
        state.hasMore = Boolean(hasMore);
        state.lastFetched = timestamp ?? Date.now();

        if (!fromCache) {
          persistClientCache(state);
        }
      })
      .addCase(fetchSiteUpdates.rejected, (state, action) => {
        const isLoadMore = Boolean(action.meta?.arg?.cursor);
        if (isLoadMore) {
          state.loadingMore = false;
        } else {
          state.status = "failed";
          state.error = action.payload || "Failed to fetch updates";
        }
      })
      .addCase(createSiteUpdate.fulfilled, (state, action) => {
        const created = action.payload;
        if (!created) return;
        state.items = mergeUpdateLists(state.items, [created]);
        state.lastFetched = Date.now();
        persistClientCache(state);
      })
      .addCase(patchSiteUpdate.fulfilled, (state, action) => {
        const updated = action.payload;
        if (!updated) return;
        state.items = mergeUpdateLists(state.items, [updated]);
        state.lastFetched = Date.now();
        persistClientCache(state);
      });
  },
});

export const { resetSiteUpdates } = siteUpdatesSlice.actions;
export default siteUpdatesSlice.reducer;
