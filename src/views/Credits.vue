<template>
  <div class="credits">
    <h1>Credits</h1>
    <div class="credits-content">
      <!-- Add your credits content here -->
      <h2>Development Team</h2>
      <p>Add team members...</p>

      <h2>Technologies Used</h2>
      <ul>
        <li>Vue.js</li>
        <li>Three.js</li>
        <!-- Add other technologies -->
      </ul>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ViewCredits',
};
</script>

<style scoped>
.credits {
  padding: 2rem;
}

.credits-content {
  max-width: 800px;
  margin: 0 auto;
}
</style>
