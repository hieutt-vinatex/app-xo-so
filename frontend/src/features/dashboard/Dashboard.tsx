import { useMemo } from "react";

import { config } from "../../config";
import { useDaysParam } from "../../hooks/useDaysParam";
import { useGdbRealtime } from "../../hooks/useGdbRealtime";
import { useGdbSnapshot } from "../../hooks/useGdbSnapshot";
import { useManualRefresh } from "../../hooks/useManualRefresh";
import { useTheme } from "../../utils/theme";

import { DashboardHeader } from "./DashboardHeader";
import { KpiCards } from "../../components/KpiCards";
import { PartialWarning, StaleWarning } from "../../components/Alerts";
import { Disclaimer } from "../../components/Disclaimer";
import { DashboardSkeleton } from "../../components/Skeletons";
import { SectionCard } from "../../components/ui/Card";
import { FrequencyBarChart } from "../../components/charts/FrequencyBarChart";
import { HistoryScatterChart } from "../../components/charts/HistoryScatterChart";
import { FrequencyHeatmap } from "../../components/charts/FrequencyHeatmap";
import { DigitBarChart } from "../../components/charts/DigitBarChart";
import { EvenOddDonut } from "../../components/charts/EvenOddDonut";
import { ColdNumbersList, TopNumbersList } from "../../components/NumberLists";
import { HistoryTable } from "../../components/HistoryTable";
import { formatPercent } from "../../utils/format";

export function Dashboard(): JSX.Element {
  const [days, setDays] = useDaysParam();
  const { theme } = useTheme();

  const realtime = useGdbRealtime(days);
  const online = realtime.status === "online";
  // Fallback REST polling only while SSE is not connected.
  const query = useGdbSnapshot(days, online ? false : config.fallbackPollMs);
  const manual = useManualRefresh();

  const data = query.data;
  const realtimeHint = useMemo(() => {
    if (!data) return "…";
    if (data.meta.realtimeEnabled) return online ? "Trực tuyến" : realtime.status;
    return "Tắt";
  }, [data, online, realtime.status]);

  const refreshDisabled =
    manual.isRefreshing ||
    (manual.cooldownUntil !== null && Date.now() < manual.cooldownUntil);

  return (
    <div className="min-h-screen bg-surface-bg dark:bg-slate-900 text-ink dark:text-slate-100">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:top-2 focus:left-2 focus:rounded-lg focus:bg-white focus:px-3 focus:py-2 focus:text-ink focus:shadow"
      >
        Bỏ qua tới nội dung chính
      </a>

      <div className="mx-auto max-w-7xl px-3 sm:px-6 py-4 sm:py-6 space-y-4">
        <DashboardHeader
          meta={data?.meta}
          status={realtime.status}
          days={days}
          onDaysChange={setDays}
          onRefresh={manual.refresh}
          isRefreshing={manual.isRefreshing}
          refreshDisabled={refreshDisabled}
          refreshMessage={manual.message}
          refreshIsError={manual.isError}
        />

        <main id="main" className="space-y-4">
          {query.isError && !data ? (
            <ErrorState onRetry={() => query.refetch()} />
          ) : !data ? (
            <DashboardSkeleton />
          ) : (
            <>
              <StaleWarning meta={data.meta} />
              <PartialWarning meta={data.meta} />

              <KpiCards stats={data.statistics} realtimeHint={realtimeHint} />

              <SectionCard
                title="Tần suất xuất hiện 00–99"
                description="Số lần mỗi số xuất hiện trong phạm vi đã chọn. ★ = nhóm xuất hiện nhiều."
              >
                <FrequencyBarChart
                  frequencies={data.statistics.frequencies}
                  topNumbers={data.statistics.topNumbers}
                  theme={theme}
                />
              </SectionCard>

              <SectionCard
                title="Lịch sử theo thời gian"
                description="Mỗi điểm là một kết quả rời rạc theo ngày (không phải xu hướng dự đoán)."
              >
                <HistoryScatterChart records={data.data} theme={theme} />
              </SectionCard>

              <div className="grid lg:grid-cols-2 gap-4">
                <SectionCard
                  title="Bản đồ nhiệt 00–99"
                  description="Phân bố tần suất theo hàng chục (dọc) và hàng đơn vị (ngang)."
                >
                  <FrequencyHeatmap frequencies={data.statistics.frequencies} theme={theme} />
                </SectionCard>

                <div className="space-y-4">
                  <SectionCard
                    title="Chữ số hàng chục & đơn vị"
                    description="So sánh tần suất chữ số 0–9 ở hai vị trí."
                  >
                    <DigitBarChart
                      tens={data.statistics.tensDigitFrequency}
                      units={data.statistics.unitsDigitFrequency}
                      theme={theme}
                    />
                  </SectionCard>

                  <SectionCard
                    title="Phân bố chẵn / lẻ"
                    description={`Chẵn ${formatPercent(data.statistics.evenOdd.evenPercentage)} · Lẻ ${formatPercent(data.statistics.evenOdd.oddPercentage)}`}
                  >
                    <EvenOddDonut evenOdd={data.statistics.evenOdd} theme={theme} />
                  </SectionCard>
                </div>
              </div>

              <div className="grid lg:grid-cols-2 gap-4">
                <SectionCard title="Xuất hiện nhiều" description="Top 10 số theo số lần xuất hiện.">
                  <TopNumbersList items={data.statistics.topNumbers} />
                </SectionCard>
                <SectionCard
                  title="Ít / chưa xuất hiện"
                  description="Các số có tần suất thấp nhất trong phạm vi."
                >
                  <ColdNumbersList items={data.statistics.coldNumbers} />
                </SectionCard>
              </div>

              <SectionCard title="Bảng lịch sử" description="Kết quả theo ngày, mới nhất trước.">
                <HistoryTable records={data.data} />
              </SectionCard>
            </>
          )}

          <Disclaimer />
        </main>
      </div>
    </div>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }): JSX.Element {
  return (
    <div
      role="alert"
      className="rounded-xl2 border border-rose-300 bg-rose-50 dark:bg-rose-900/20 dark:border-rose-800 p-8 text-center"
    >
      <p className="text-lg font-semibold text-rose-800 dark:text-rose-200">
        Không tải được dữ liệu
      </p>
      <p className="mt-1 text-sm text-rose-700 dark:text-rose-300">
        Nguồn dữ liệu có thể tạm thời không phản hồi.
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 rounded-full bg-brand-gradient px-5 py-2 text-sm font-medium text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue"
      >
        Thử lại
      </button>
    </div>
  );
}
