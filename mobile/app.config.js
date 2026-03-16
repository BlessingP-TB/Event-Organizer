module.exports = ({ config }) => {
  const projectId =
    process.env.EXPO_PUBLIC_EAS_PROJECT_ID ||
    config?.extra?.eas?.projectId ||
    null;

  return {
    ...config,
    extra: {
      ...(config.extra || {}),
      eas: {
        ...((config.extra && config.extra.eas) || {}),
        ...(projectId ? { projectId } : {}),
      },
    },
  };
};
