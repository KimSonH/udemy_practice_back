import { Injectable } from '@nestjs/common';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { ClassMarker } from './classMarkers.entity';
import { ClassMarkersSearchResult } from './types/classMarkersSearchBody.interface';

@Injectable()
export class ClassMarkerSearchService {
  index: string = 'classMarkers';

  constructor(private readonly elasticsearchService: ElasticsearchService) {}

  async indexClassMarker(classMarkers: ClassMarker) {
    return this.elasticsearchService.index({
      index: this.index,
      body: {
        id: classMarkers.id,
        questionType: classMarkers.questionType,
        question: classMarkers.question,
      },
    });
  }

  async search(text: string) {
    try {
      const { body } =
        await this.elasticsearchService.search<ClassMarkersSearchResult>({
          index: this.index,
          body: {
            query: {
              match: {
                question: text,
              },
            },
          },
        });
      const hits = body.hits.hits;
      return hits.map((item) => item._source);
    } catch (error) {
      console.log(error);
    }
  }
}
