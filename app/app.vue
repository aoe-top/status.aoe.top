<template>
    <div class="min-h-screen bg-surface-0 text-text font-sans antialiased">
        <NuxtPage />
    </div>
</template>

<script setup lang="ts">
useHead({
    title: "小莫的服务状态",
    meta: [
        { name: "description", content: "aoe.top 及相关服务实时状态监控" },
        { name: "viewport", content: "width=device-width, initial-scale=1" },
    ],
    link: [{ rel: "icon", href: "/favicon.ico" }],
});
</script>
