from django.http import JsonResponse

def sign_up(request):
    if request.method == 'POST':
        return JsonResponse({'message': 'Account Created!'})
    
    return JsonResponse({'error': 'Invalid request method'}, status=400)