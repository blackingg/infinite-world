vec3 getProximityBleach(vec3 originalColor, vec3 worldPosition, vec3 playerPosition, float glowRadius, float falloffRadius)
{
    float distanceToPlayer = length(worldPosition.xz - playerPosition.xz);
    float glowFactor = 1.0 - smoothstep(glowRadius, falloffRadius, distanceToPlayer);
    
    // Calculate grayscale (bleach)
    float grayValue = dot(originalColor, vec3(0.299, 0.587, 0.114));
    vec3 bleachedColor = vec3(grayValue * 0.9);
    
    return mix(bleachedColor, originalColor, glowFactor);
}
