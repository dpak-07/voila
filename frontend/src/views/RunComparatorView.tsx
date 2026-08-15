import React from 'react';
import { ViewHeader } from '../components/common/ViewHeader';
import { RunComparator } from '../components/comparison/RunComparator';
import { motion } from 'framer-motion';

export const RunComparatorView: React.FC = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* Header */}
      <ViewHeader
        category="Model & Dataset Benchmarking"
        badge="Delta Signatures"
        title="Dataset Run Variance & Shift Comparator"
        subtitle="Compare baseline historical datasets with active runs to detect customer sentiment drift, resolution efficiency gains, and newly emerging issue clusters."
      />

      {/* Main Run Comparator Component */}
      <RunComparator />
    </motion.div>
  );
};
