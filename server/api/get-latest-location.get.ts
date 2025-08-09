export default defineEventHandler(async (event) => {
  try {
    const response = await fetch('https://my.vanmoof.com/findmybike/coords/01A697F0-AF74-9A48-5EEF-F6062001874B', {
      headers: {
        'Cookie': 'XSRF-TOKEN=eyJpdiI6InFCeEVWQTlCbU1QaHJqTUE1WjB0enc9PSIsInZhbHVlIjoid3J2Q0N6bGJ4cllJRGRxR2pIVmsrTXViU0N5cU5Fa212ZVwvdDQ3YlNGMERiY2dNb2ZnMkdHQlp3RWdxYVMyQU44U3NPeGp5bzhsa25DM01QWmd1dEtBPT0iLCJtYWMiOiI3MTM2MDExZjU0ZWU3NzYxMTcwYTE2NDk4OTQ4OWNiZGYwY2UzOTVkMmIzNTliYjZiZjk3MDliZDZlNjlhMTczIn0%3D; laravel_session=eyJpdiI6InAra24yZTc5Uk91TjZWd3ZNNUxzcVE9PSIsInZhbHVlIjoiTnhWdUxxeW92T3ZmNFh1c0NFQ2s2VWFWWTZRQVVoR25haitWY3VYcEdkOUpxdjVzN0ZDd21XYUMybVJVQ2hnZWVLalhqaVQyVWUrYldoZmRXN1BYS3c9PSIsIm1hYyI6ImUzMmYzYmZlMjY3YzA4NmRkODAxOTdhNWVlNTkxMDAwOGNjMWVkZDkzMWY4YzZjYTk5MDYxMzZhMjJmNTdiNzUifQ%3D%3D'
      }
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()

    // Filter coordinates to only include data from August 1st, 2025 onward
    if (data.coordinates && Array.isArray(data.coordinates)) {
      const cutoffDate = new Date('2025-08-01T00:00:00.000Z')

      data.coordinates = data.coordinates.filter(coord => {
        if (!coord.datetime?.user?.date) return false

        // Parse the date string (format: "DD-MM-YYYY")
        const [day, month, year] = coord.datetime.user.date.split('-')
        const coordDate = new Date(`${year}-${month}-${day}T00:00:00.000Z`)

        return coordDate >= cutoffDate
      })

      console.log(`Filtered coordinates: ${data.coordinates.length} entries from August 1st, 2025 onward`)
    }

    return {
      success: true,
      data: data
    }
  } catch (error) {
    console.error('Error fetching bike location:', error)

    return {
      success: false,
      error: error.message,
      data: null
    }
  }
})
