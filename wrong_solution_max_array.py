# Wrong Solution - This should FAIL some test cases
# (Returns first element instead of maximum)

# Read input
n = int(input())
arr = list(map(int, input().split()))

# Wrong logic - just return first element
print(arr[0])
