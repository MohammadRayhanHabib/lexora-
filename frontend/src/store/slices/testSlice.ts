import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { testApi } from "../../api/tests";
import type { IPracticeTest, IMockTest, IAttempt } from "../../types";

interface TestState {
  practiceTests: IPracticeTest[];
  mockTests: IMockTest[];
  currentTest: IPracticeTest | IMockTest | null;
  currentAttempt: IAttempt | null;
  myAttempts: IAttempt[];
  loading: boolean;
  error: string | null;
}

const initialState: TestState = {
  practiceTests: [],
  mockTests: [],
  currentTest: null,
  currentAttempt: null,
  myAttempts: [],
  loading: false,
  error: null,
};

export const fetchPracticeTests = createAsyncThunk(
  "tests/fetchPractice",
  async (module?: string) => {
    const res = await testApi.listPracticeTests(module);
    return res.data.data;
  },
);

export const fetchMockTests = createAsyncThunk("tests/fetchMock", async () => {
  const res = await testApi.listMockTests();
  return res.data.data;
});

export const fetchMyAttempts = createAsyncThunk(
  "tests/fetchMyAttempts",
  async ({ page, limit }: { page?: number; limit?: number } = {}) => {
    const res = await testApi.getMyAttempts(page, limit);
    return res.data.data;
  },
);

export const startPracticeTest = createAsyncThunk(
  "tests/startPractice",
  async (data: { testId: string; module: string }, { rejectWithValue }) => {
    try {
      const res = await testApi.startPractice(data);
      return res.data.data;
    } catch (err: any) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to start test",
      );
    }
  },
);

export const startMockTest = createAsyncThunk(
  "tests/startMock",
  async (data: { testId: string }, { rejectWithValue }) => {
    try {
      const res = await testApi.startMock(data);
      return res.data.data;
    } catch (err: any) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to start test",
      );
    }
  },
);

export const submitPracticeAnswers = createAsyncThunk(
  "tests/submitPractice",
  async (
    { attemptId, answers }: { attemptId: string; answers: any },
    { rejectWithValue },
  ) => {
    try {
      const res = await testApi.submitPractice(attemptId, { answers });
      return res.data.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || "Failed to submit");
    }
  },
);

export const submitMockAnswers = createAsyncThunk(
  "tests/submitMock",
  async (
    { attemptId, answers }: { attemptId: string; answers: any },
    { rejectWithValue },
  ) => {
    try {
      const res = await testApi.submitMock(attemptId, { answers });
      return res.data.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || "Failed to submit");
    }
  },
);

const testSlice = createSlice({
  name: "tests",
  initialState,
  reducers: {
    setCurrentTest(
      state,
      action: PayloadAction<IPracticeTest | IMockTest | null>,
    ) {
      state.currentTest = action.payload;
    },
    clearAttempt(state) {
      state.currentAttempt = null;
    },
    clearError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    /* practice tests list */
    builder.addCase(fetchPracticeTests.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(fetchPracticeTests.fulfilled, (state, action) => {
      state.loading = false;
      state.practiceTests = action.payload;
    });
    builder.addCase(fetchPracticeTests.rejected, (state) => {
      state.loading = false;
    });

    /* mock tests list */
    builder.addCase(fetchMockTests.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(fetchMockTests.fulfilled, (state, action) => {
      state.loading = false;
      state.mockTests = action.payload;
    });
    builder.addCase(fetchMockTests.rejected, (state) => {
      state.loading = false;
    });

    /* my attempts */
    builder.addCase(fetchMyAttempts.fulfilled, (state, action) => {
      state.myAttempts = action.payload;
    });

    /* start practice */
    builder.addCase(startPracticeTest.fulfilled, (state, action) => {
      state.currentAttempt = action.payload;
    });
    builder.addCase(startPracticeTest.rejected, (state, action) => {
      state.error = action.payload as string;
    });

    /* start mock */
    builder.addCase(startMockTest.fulfilled, (state, action) => {
      state.currentAttempt = action.payload;
    });
    builder.addCase(startMockTest.rejected, (state, action) => {
      state.error = action.payload as string;
    });

    /* submit practice */
    builder.addCase(submitPracticeAnswers.fulfilled, (state, action) => {
      state.currentAttempt = action.payload;
    });

    /* submit mock */
    builder.addCase(submitMockAnswers.fulfilled, (state, action) => {
      state.currentAttempt = action.payload;
    });
  },
});

export const { setCurrentTest, clearAttempt, clearError } = testSlice.actions;
export default testSlice.reducer;
